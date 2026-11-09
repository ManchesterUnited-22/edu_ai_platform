// So khớp Topic/liên kết chunk giữa PostgreSQL và Neo4j. Chạy: npm run graph:check
import prisma from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { closeDriver } from '../src/config/neo4j.js';
import { computeGraphDrift } from '../src/services/graph/graphRebuild.js';

try {
  if (!env.GRAPH_ENABLED) throw new Error('Hãy đặt GRAPH_ENABLED=true trong backend/.env trước');
  const problems = await computeGraphDrift();
  if (problems.length === 0) console.log('Đồng bộ: OK, PostgreSQL và Neo4j khớp nhau.');
  else {
    console.log(`Phát hiện ${problems.length} nhóm lệch:`);
    console.table(problems);
    console.log('Sửa bằng: npm run graph:rebuild');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Không kiểm tra được:', error.message);
  process.exitCode = 1;
} finally {
  await closeDriver();
  await prisma.$disconnect();
}