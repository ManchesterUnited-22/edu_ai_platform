// Dựng lại graph từ PostgreSQL. Chạy: npm run graph:rebuild
import prisma from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { closeDriver } from '../src/config/neo4j.js';
import { rebuildGraph } from '../src/services/graph/graphRebuild.js';

try {
  if (!env.GRAPH_ENABLED) throw new Error('Hãy đặt GRAPH_ENABLED=true trong backend/.env trước');
  console.log('Đã dựng lại graph:', await rebuildGraph());
} catch (error) {
  console.error('Lỗi:', error.message);
  process.exitCode = 1;
} finally {
  await closeDriver();
  await prisma.$disconnect();
}