// Chạy Cypher qua neo4j-driver, tự bắt lỗi khi graph tắt/không kết nối được
import neo4j from 'neo4j-driver';
import { env } from '../../config/env.js';
import { getDriver } from '../../config/neo4j.js';

export class GraphUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GraphUnavailableError';
  }
}

const toPlain = (v) => {
  if (neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(toPlain);
  return v;
};

/** @returns {Promise<object[]>} mỗi bản ghi là object {tênCột: giá trị} */
export async function runCypher(query, params = {}, deps = {}) {
  const driver = deps.driver ?? getDriver();
  if (!driver) throw new GraphUnavailableError('Graph đang tắt (GRAPH_ENABLED=false)');
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map((r) => Object.fromEntries(r.keys.map((key) => [key, toPlain(r.get(key))])));
  } catch (error) {
    throw new GraphUnavailableError(`Neo4j lỗi: ${error.message}`);
  } finally {
    await session.close().catch(() => {});
  }
}

/** Chạy việc phụ với graph: tắt thì bỏ qua im lặng, lỗi chỉ ghi log, KHÔNG chặn thao tác chính. */
export async function tryGraph(fn, label) {
  if (!env.GRAPH_ENABLED) return null;
  try {
    return await fn();
  } catch (error) {
    console.warn(`[graph] ${label}: ${error.message}`);
    return null;
  }
}