// Chủ đề: CRUD trong PostgreSQL (nguồn gốc) + đồng bộ nút Topic / cạnh CHA_CUA sang Neo4j (best-effort)
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { runCypher, tryGraph } from './graphClient.js';

export async function upsertTopicNode({ id, name, classId, parentId }, deps = {}) {
  await runCypher(
    `MERGE (t:Topic {id: $id}) SET t.name = $name, t.classId = $classId
     WITH t OPTIONAL MATCH (:Topic)-[r:CHA_CUA]->(t) DELETE r`,
    { id, name, classId },
    deps,
  );
  if (parentId) {
    await runCypher(
      'MATCH (p:Topic {id: $parentId}), (t:Topic {id: $id}) MERGE (p)-[:CHA_CUA]->(t)',
      { id, parentId },
      deps,
    );
  }
}

export const deleteTopicNode = (id, deps = {}) =>
  runCypher('MATCH (t:Topic {id: $id}) DETACH DELETE t', { id }, deps);

const notFound = () => new AppError('Không tìm thấy chủ đề', 404, 'TOPIC_NOT_FOUND');

export async function listTopics({ classId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const [topics, prerequisites] = await Promise.all([
    prisma.topic.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true },
    }),
    prisma.topicPrerequisite.findMany({
      where: { topic: { classId } },
      select: { topicId: true, prerequisiteId: true },
    }),
  ]);
  return { topics, prerequisites };
}

/** Cha phải cùng lớp và không được là chính nó hoặc hậu duệ của nó (tránh vòng trong cây). */
async function assertParentValid(prisma, classId, topicId, parentId) {
  if (!parentId) return;
  if (parentId === topicId) throw new AppError('Chủ đề không thể là cha của chính nó', 400, 'INVALID_PARENT');

  const all = await prisma.topic.findMany({ where: { classId }, select: { id: true, parentId: true } });
  const byId = new Map(all.map((t) => [t.id, t]));
  if (!byId.has(parentId)) throw new AppError('Chủ đề cha không thuộc lớp này', 400, 'INVALID_PARENT');

  // đi ngược từ cha lên gốc: gặp chính chủ đề đang sửa nghĩa là sẽ tạo vòng
  for (let cur = byId.get(parentId), guard = 0; cur && guard < 1000; cur = byId.get(cur.parentId), guard += 1) {
    if (cur.id === topicId) throw new AppError('Không thể chọn chủ đề con làm cha', 400, 'INVALID_PARENT');
  }
}

export async function createTopic({ classId, name, parentId = null }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  await assertParentValid(prisma, classId, null, parentId);
  const topic = await prisma.topic.create({
    data: { classId, name, parentId },
    select: { id: true, classId: true, name: true, parentId: true },
  });
  await tryGraph(() => upsertTopicNode(topic, deps), 'tạo nút Topic');
  return topic;
}

export async function updateTopic({ classId, topicId, name, parentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const existing = await prisma.topic.findFirst({ where: { id: topicId, classId }, select: { id: true } });
  if (!existing) throw notFound();

  if (parentId !== undefined) await assertParentValid(prisma, classId, topicId, parentId);
  const topic = await prisma.topic.update({
    where: { id: topicId },
    data: { ...(name !== undefined ? { name } : {}), ...(parentId !== undefined ? { parentId } : {}) },
    select: { id: true, classId: true, name: true, parentId: true },
  });
  await tryGraph(() => upsertTopicNode(topic, deps), 'sửa nút Topic');
  return topic;
}

export async function deleteTopic({ classId, topicId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const existing = await prisma.topic.findFirst({ where: { id: topicId, classId }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.topic.delete({ where: { id: topicId } });
  await tryGraph(() => deleteTopicNode(topicId, deps), 'xóa nút Topic');
}