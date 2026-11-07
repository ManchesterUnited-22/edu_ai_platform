// Hàng đợi xử lý tài liệu nền: chạy tuần tự từng tài liệu trong cùng tiến trình
import prisma from '../config/db.js';
import { processDocument } from '../services/ingestion/pipeline.js';

const queue = [];
let running = false;

async function drain() {
  if (running) return;
  running = true;
  while (queue.length > 0) {
    const documentId = queue.shift();
    try {
      await processDocument(documentId);
    } catch (error) {
      console.error(`Xử lý tài liệu ${documentId} lỗi:`, error);
    }
  }
  running = false;
}

export function enqueueDocument(documentId) {
  if (!queue.includes(documentId)) queue.push(documentId);
  setImmediate(drain);
}

/** Gọi khi khởi động server: xử lý lại các tài liệu bị dở dang do server tắt giữa chừng. */
export async function recoverPendingDocuments() {
  const pending = await prisma.document.findMany({
    where: { processStatus: { in: ['uploaded', 'processing'] } },
    select: { id: true },
  });
  pending.forEach((d) => enqueueDocument(d.id));
  return pending.length;
}