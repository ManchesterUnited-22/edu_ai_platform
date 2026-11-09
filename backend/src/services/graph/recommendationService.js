// Chủ đề yếu (từ PostgreSQL) + chủ đề tiên quyết (từ graph) -> gợi ý ôn tập kèm chunk đã publish.
// Graph tắt/lỗi thì tự dùng đường dự phòng tính trên PostgreSQL: người dùng vẫn nhận được gợi ý.
import defaultPrisma from '../../config/db.js';
import { getStudentProgress } from '../progress/progressService.js';
import { runCypher, tryGraph } from './graphClient.js';
import { loadChunkTopicPairs } from './graphSync.js';
import { collectPrerequisites } from './prerequisiteService.js';

const MAX_DEPTH = 4;
const MAX_CHUNKS_PER_TOPIC = 2;
const EXCERPT = 400;

async function fromGraph(weakIds, deps) {
  const prereqRows = await runCypher(
    `MATCH path = (t:Topic)-[:CAN_BIET_TRUOC*1..${MAX_DEPTH}]->(p:Topic)
     WHERE t.id IN $ids
     RETURN t.id AS topicId, p.id AS id, min(length(path)) AS depth`,
    { ids: weakIds },
    deps,
  );
  const prereqOf = new Map();
  for (const { topicId, id, depth } of prereqRows) {
    if (!prereqOf.has(topicId)) prereqOf.set(topicId, []);
    prereqOf.get(topicId).push({ id, depth });
  }
  const allIds = [...new Set([...weakIds, ...prereqRows.map((r) => r.id)])];
  const chunkRows = await runCypher(
    `MATCH (t:Topic)-[:CO_TRONG]->(c:Chunk) WHERE t.id IN $ids
     RETURN t.id AS topicId, collect(c.id) AS chunkIds`,
    { ids: allIds },
    deps,
  );
  return { prereqOf, chunkIdsOf: new Map(chunkRows.map((r) => [r.topicId, r.chunkIds])) };
}

async function fromPostgres(prisma, classId, weakIds, edges) {
  const prereqOf = new Map(weakIds.map((id) => [id, collectPrerequisites(edges, id, MAX_DEPTH)]));
  const pairs = await loadChunkTopicPairs(prisma, { classId });
  const chunkIdsOf = new Map();
  for (const { topicId, chunkId } of pairs) {
    if (!chunkIdsOf.has(topicId)) chunkIdsOf.set(topicId, []);
    chunkIdsOf.get(topicId).push(chunkId);
  }
  return { prereqOf, chunkIdsOf };
}

export async function getRecommendations({ studentId, classId, useGraph = false }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const { weakTopics } = await getStudentProgress({ studentId, classId }, deps);
  if (weakTopics.length === 0) return { graphUsed: false, recommendations: [] };

  const [topics, edges] = await Promise.all([
    prisma.topic.findMany({ where: { classId }, select: { id: true, name: true } }),
    prisma.topicPrerequisite.findMany({
      where: { topic: { classId } },
      select: { topicId: true, prerequisiteId: true },
    }),
  ]);
  const idByName = new Map(topics.map((t) => [t.name, t.id]));
  const nameById = new Map(topics.map((t) => [t.id, t.name]));
  const weakIds = weakTopics.map((w) => idByName.get(w.topic)).filter(Boolean);

  let source = useGraph ? await tryGraph(() => fromGraph(weakIds, deps), 'truy vấn gợi ý') : null;
  const graphUsed = source !== null;
  source ??= await fromPostgres(prisma, classId, weakIds, edges);

  // Chunk lấy từ graph có thể đã cũ: luôn lọc lại theo Postgres, chỉ giữ tài liệu ĐANG published của lớp
  const wantedChunkIds = [...new Set([...source.chunkIdsOf.values()].flat())];
  const chunks = wantedChunkIds.length
    ? await prisma.chunk.findMany({
        where: { id: { in: wantedChunkIds }, document: { classId, publishStatus: 'published' } },
        select: { id: true, text: true, pageNumber: true, document: { select: { fileName: true } } },
      })
    : [];
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  const recommendations = weakTopics.map((weak) => {
    const topicId = idByName.get(weak.topic);
    // Nền tảng sâu nhất ôn trước, chủ đề yếu ôn cuối
    const prerequisites = (source.prereqOf.get(topicId) ?? []).sort((a, b) => b.depth - a.depth);
    const order = topicId ? [...prerequisites.map((p) => p.id), topicId] : [];

    const materials = order.flatMap((id) =>
      (source.chunkIdsOf.get(id) ?? [])
        .map((chunkId) => chunkById.get(chunkId))
        .filter(Boolean)
        .slice(0, MAX_CHUNKS_PER_TOPIC)
        .map((c) => ({
          topic: nameById.get(id),
          chunkId: c.id,
          fileName: c.document.fileName,
          pageNumber: c.pageNumber,
          excerpt: c.text.slice(0, EXCERPT),
        })),
    );
    return {
      topic: weak.topic,
      accuracy: weak.accuracy,
      reviewFirst: prerequisites.map((p) => ({ topic: nameById.get(p.id), depth: p.depth })),
      materials,
    };
  });
  return { graphUsed, recommendations };
}