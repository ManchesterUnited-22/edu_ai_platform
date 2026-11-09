// Kết nối Neo4j (Graph DB). Chỉ tạo driver khi GRAPH_ENABLED=true.
import neo4j from 'neo4j-driver';
import { env } from './env.js';

let driver;

export function getDriver() {
  if (!env.GRAPH_ENABLED) return null;
  driver ??= neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD), {
    connectionTimeout: 3000,
    maxTransactionRetryTime: 3000,
  });
  return driver;
}

export async function closeDriver() {
  await driver?.close();
  driver = undefined;
}