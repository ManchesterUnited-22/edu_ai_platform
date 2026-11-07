// Kiểm tra đồng bộ SQL <-> vector DB. Chạy: npm run check-sync
import prisma from '../src/config/db.js';
import { computeSyncDrift } from '../src/services/publishing/vectorSync.js';

try {
  const { publishedCount, problems } = await computeSyncDrift();
  console.log(`Tài liệu đã xuất bản: ${publishedCount}`);
  if (problems.length === 0) {
    console.log('Đồng bộ: OK, Postgres và ChromaDB khớp nhau.');
  } else {
    console.log(`Phát hiện ${problems.length} điểm lệch:`);
    console.table(problems);
    console.log('Sửa bằng: npm run reindex');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Không kiểm tra được:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}