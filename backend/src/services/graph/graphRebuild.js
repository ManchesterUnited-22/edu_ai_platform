// Dựng lại toàn bộ graph từ PostgreSQL (graph mất thì dựng lại được) và so khớp hai bên
import defaultPrisma from '../../config/db.js';
import { runCypher } from './graphClient.js';
import { loadChunkTopicPairs } from './graphSync.js';

async function loadSource(prisma) {
  const [topics, prerequisites, pairs] = await Promise.all([
    prisma.topic.findMany({ select: { id: true, name: true, classId: true, parentId: true } }),
    prisma.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } }),
    loadChunkTopicPairs(prisma),
  ]);
  return { topics, prerequisites, pairs };
}

export async function rebuildGraph(deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const { topics, prerequisites, pairs } = await loadSource(prisma);

  await runCypher('CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE', {}, deps);
  await runCypher('CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.id IS UNIQUE', {}, deps);
  await runCypher('MATCH (n) WHERE n:Topic OR n:Chunk DETACH DELETE n', {}, deps);

  await runCypher(
    'UNWIND $topics AS t CREATE (:Topic {id: t.id, name: t.name, classId: t.classId})',
    { topics },
    deps,
  );
  await runCypher(
    `UNWIND $edges AS e
     MATCH (p:Topic {id: e.parentId}), (t:Topic {id: e.id})
     CREATE (p)-[:CHA_CUA]->(t)`,
    { edges: topics.filter((t) => t.parentId) },
    deps,
  );
  await runCypher(
    `UNWIND $edges AS e
     MATCH (a:Topic {id: e.topicId}), (b:Topic {id: e.prerequisiteId})
     CREATE (a)-[:CAN_BIET_TRUOC]->(b)`,
    { edges: prerequisites },
    deps,
  );
  await runCypher(
    `UNWIND $pairs AS p
     MATCH (t:Topic {id: p.topicId})
     MERGE (c:Chunk {id: p.chunkId})
     MERGE (t)-[:CO_TRONG]->(c)`,
    { pairs },
    deps,
  );
  return { topics: topics.length, prerequisites: prerequisites.length, chunkLinks: pairs.length };
}

const diff = (expected, actual) => ({
  missing: [...expected].filter((x) => !actual.has(x)),
  extra: [...actual].filter((x) => !expected.has(x)),
});

/** So khớp Topic, cạnh tiên quyết và liên kết chunk giữa PostgreSQL và Neo4j. Rỗng = đồng bộ. */
export async function computeGraphDrift(deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const { topics, prerequisites, pairs } = await loadSource(prisma);

  const [gTopics, gPrereq, gLinks] = await Promise.all([
    runCypher('MATCH (t:Topic) RETURN t.id AS key', {}, deps),
    runCypher('MATCH (a:Topic)-[:CAN_BIET_TRUOC]->(b:Topic) RETURN a.id + "|" + b.id AS key', {}, deps),
    runCypher('MATCH (t:Topic)-[:CO_TRONG]->(c:Chunk) RETURN t.id + "|" + c.id AS key', {}, deps),
  ]);

  const checks = [
    ['topic', new Set(topics.map((t) => t.id)), new Set(gTopics.map((r) => r.key))],
    ['prerequisite', new Set(prerequisites.map((e) => `${e.topicId}|${e.prerequisiteId}`)), new Set(gPrereq.map((r) => r.key))],
    ['chunk_link', new Set(pairs.map((p) => `${p.topicId}|${p.chunkId}`)), new Set(gLinks.map((r) => r.key))],
  ];
  return checks
    .map(([type, expected, actual]) => ({ type, ...diff(expected, actual) }))
    .filter((d) => d.missing.length || d.extra.length)
    .map((d) => ({ type: d.type, missing: d.missing.length, extra: d.extra.length }));
}