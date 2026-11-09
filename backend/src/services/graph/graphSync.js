// Gắn/gỡ liên kết chunk khi publish/thu hồi; lỗi chỉ ghi log, không chặn thao tác chính.
// Chủ đề của một chunk suy ra từ câu hỏi: câu hỏi có `topic` = tên chủ đề và `sourceChunkId` = chunk đó.
import defaultPrisma from '../../config/db.js';
import { runCypher } from './graphClient.js';

/**
 * Các cặp {topicId, chunkId} của tài liệu ĐÃ PUBLISH. `documentWhere` lọc thêm theo tài liệu (id, classId...).
 */
export async function loadChunkTopicPairs(prisma, documentWhere = {}) {
  const questions = await prisma.question.findMany({
    where: {
      topic: { not: null },
      sourceChunkId: { not: null },
      sourceChunk: { document: { publishStatus: 'published', ...documentWhere } },
    },
    select: { classId: true, topic: true, sourceChunkId: true },
  });
  if (questions.length === 0) return [];

  const topics = await prisma.topic.findMany({
    where: { classId: { in: [...new Set(questions.map((q) => q.classId))] } },
    select: { id: true, classId: true, name: true },
  });
  const idByKey = new Map(topics.map((t) => [`${t.classId}|${t.name}`, t.id]));

  const pairs = new Map();
  for (const q of questions) {
    const topicId = idByKey.get(`${q.classId}|${q.topic}`);
    if (topicId) pairs.set(`${topicId}|${q.sourceChunkId}`, { topicId, chunkId: q.sourceChunkId });
  }
  return [...pairs.values()];
}

export async function linkDocumentChunks(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const pairs = await loadChunkTopicPairs(prisma, { id: documentId });
  if (pairs.length === 0) return 0;
  await runCypher(
    `UNWIND $pairs AS p
     MATCH (t:Topic {id: p.topicId})
     MERGE (c:Chunk {id: p.chunkId})
     MERGE (t)-[:CO_TRONG]->(c)`,
    { pairs },
    deps,
  );
  return pairs.length;
}

export async function unlinkDocumentChunks(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const chunks = await prisma.chunk.findMany({ where: { documentId }, select: { id: true } });
  if (chunks.length === 0) return 0;
  await runCypher('MATCH (c:Chunk) WHERE c.id IN $ids DETACH DELETE c', { ids: chunks.map((c) => c.id) }, deps);
  return chunks.length;
}