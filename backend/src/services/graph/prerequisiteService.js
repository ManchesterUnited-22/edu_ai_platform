// Quan hệ CAN_BIET_TRUOC: thêm/xóa, chặn vòng lặp, truy vấn chủ đề tiên quyết nhiều bước
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { runCypher, tryGraph } from './graphClient.js';

const adjacency = (edges) => {
  const map = new Map();
  for (const { topicId, prerequisiteId } of edges) {
    if (!map.has(topicId)) map.set(topicId, []);
    map.get(topicId).push(prerequisiteId);
  }
  return map;
};

/**
 * Thêm "topicId cần biết trước prerequisiteId" có tạo vòng không?
 * Có vòng nếu từ prerequisiteId đi theo các cạnh tiên quyết lại tới được topicId.
 */
export function wouldCreateCycle(edges, topicId, prerequisiteId) {
  if (topicId === prerequisiteId) return true;
  const next = adjacency(edges);
  const seen = new Set([prerequisiteId]);
  const stack = [prerequisiteId];
  while (stack.length) {
    for (const id of next.get(stack.pop()) ?? []) {
      if (id === topicId) return true;
      if (!seen.has(id)) {
        seen.add(id);
        stack.push(id);
      }
    }
  }
  return false;
}

/** Mọi chủ đề tiên quyết (nhiều bước) của topicId: [{id, depth}], depth = số bước ngắn nhất. */
export function collectPrerequisites(edges, topicId, maxDepth = 4) {
  const next = adjacency(edges);
  const depthOf = new Map();
  let frontier = [topicId];
  for (let depth = 1; depth <= maxDepth && frontier.length; depth += 1) {
    const upcoming = [];
    for (const id of frontier) {
      for (const pre of next.get(id) ?? []) {
        if (pre !== topicId && !depthOf.has(pre)) {
          depthOf.set(pre, depth);
          upcoming.push(pre);
        }
      }
    }
    frontier = upcoming;
  }
  return [...depthOf].map(([id, depth]) => ({ id, depth }));
}

export async function addPrerequisite({ classId, topicId, prerequisiteId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const found = await prisma.topic.findMany({
    where: { classId, id: { in: [topicId, prerequisiteId] } },
    select: { id: true },
  });
  if (found.length !== new Set([topicId, prerequisiteId]).size) {
    throw new AppError('Không tìm thấy chủ đề', 404, 'TOPIC_NOT_FOUND');
  }

  const edges = await prisma.topicPrerequisite.findMany({
    where: { topic: { classId } },
    select: { topicId: true, prerequisiteId: true },
  });
  if (wouldCreateCycle(edges, topicId, prerequisiteId)) {
    throw new AppError('Quan hệ này tạo vòng lặp tiên quyết', 409, 'PREREQUISITE_CYCLE');
  }

  await prisma.topicPrerequisite.create({ data: { topicId, prerequisiteId } }); // trùng -> 409 (P2002)
  await tryGraph(
    () =>
      runCypher(
        'MATCH (a:Topic {id: $topicId}), (b:Topic {id: $prerequisiteId}) MERGE (a)-[:CAN_BIET_TRUOC]->(b)',
        { topicId, prerequisiteId },
        deps,
      ),
    'thêm cạnh CAN_BIET_TRUOC',
  );
}

export async function removePrerequisite({ classId, topicId, prerequisiteId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const { count } = await prisma.topicPrerequisite.deleteMany({
    where: { topicId, prerequisiteId, topic: { classId } },
  });
  if (count === 0) throw new AppError('Không có quan hệ tiên quyết này', 404, 'PREREQUISITE_NOT_FOUND');
  await tryGraph(
    () =>
      runCypher(
        'MATCH (:Topic {id: $topicId})-[r:CAN_BIET_TRUOC]->(:Topic {id: $prerequisiteId}) DELETE r',
        { topicId, prerequisiteId },
        deps,
      ),
    'xóa cạnh CAN_BIET_TRUOC',
  );
}