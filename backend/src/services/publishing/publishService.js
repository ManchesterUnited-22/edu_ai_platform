// Máy trạng thái nội dung: draft -> reviewed -> published -> revoked (-> reviewed ...)
//  - review   : giáo viên xem lại nội dung và xác nhận (BẮT BUỘC trước khi xuất bản)
//  - publish  : embed + ghi vào vector DB, rồi mới đổi trạng thái
//  - unpublish: xóa vector khỏi vector DB TRƯỚC, rồi mới đổi trạng thái
// Thứ tự "vector trước, trạng thái sau" đảm bảo nội dung đã thu hồi không bao giờ còn trả lời được.
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as defaultStore from '../rag/vectorStore.js';
import { indexDocument } from './vectorSync.js';
import { linkDocumentChunks, unlinkDocumentChunks } from '../graph/graphSync.js';   // + cạnh các import
import { tryGraph } from '../graph/graphClient.js';

const inFlight = new Set();

export const isBusy = (documentId) => inFlight.has(documentId);

async function withLock(documentId, fn) {
  if (inFlight.has(documentId)) {
    throw new AppError('Tài liệu đang được xuất bản/thu hồi, vui lòng thử lại sau', 409, 'DOCUMENT_BUSY');
  }
  inFlight.add(documentId);
  try {
    return await fn();
  } finally {
    inFlight.delete(documentId);
  }
}

async function loadState(prisma, documentId) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, processStatus: true, publishStatus: true },
  });
  if (!doc) throw new AppError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');
  return doc;
}

const invalidTransition = (message) => new AppError(message, 409, 'INVALID_TRANSITION');

export async function reviewDocument(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const doc = await loadState(prisma, documentId);

  if (doc.processStatus !== 'ready') {
    throw new AppError('Tài liệu chưa xử lý xong nên chưa thể duyệt', 409, 'DOCUMENT_NOT_READY');
  }
  const { count } = await prisma.document.updateMany({
    where: { id: documentId, publishStatus: { in: ['draft', 'revoked'] } },
    data: { publishStatus: 'reviewed' },
  });
  if (count === 0) {
    throw invalidTransition(`Không thể duyệt tài liệu đang ở trạng thái "${doc.publishStatus}"`);
  }
}

export async function publishDocument(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const store = deps.store ?? defaultStore;

  return withLock(documentId, async () => {
    const doc = await loadState(prisma, documentId);
    if (doc.publishStatus !== 'reviewed') {
      throw invalidTransition(
        doc.publishStatus === 'published'
          ? 'Tài liệu đã được xuất bản'
          : 'Phải duyệt (review) tài liệu trước khi xuất bản',
      );
    }
    if (doc.processStatus !== 'ready') {
      throw new AppError('Tài liệu chưa xử lý xong', 409, 'DOCUMENT_NOT_READY');
    }

    // 1) embed + ghi vector. Lỗi ở đây -> trạng thái vẫn là "reviewed", không có gì thay đổi.
    await indexDocument(documentId, deps);

    // 2) đổi trạng thái. Nếu thất bại thì gỡ vector vừa ghi để Postgres và Chroma không lệch.
    try {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.document.updateMany({
          where: { id: documentId, publishStatus: 'reviewed' },
          data: { publishStatus: 'published', publishedAt: new Date() },
        });
        if (count === 0) {
          throw new AppError('Tài liệu vừa bị thay đổi, hãy duyệt lại rồi xuất bản', 409, 'DOCUMENT_CHANGED');
        }
        await tx.$executeRaw`UPDATE "Chunk" SET "embeddingId" = "id" WHERE "documentId" = ${documentId}`;
      });
      await tryGraph(() => linkDocumentChunks(documentId, deps), 'gắn chunk vào graph'); // +
    } catch (error) {
      await store.deleteByDocument(documentId).catch(() => {});
      throw error;
    }
  });
}

export async function unpublishDocument(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const store = deps.store ?? defaultStore;

  return withLock(documentId, async () => {
    const doc = await loadState(prisma, documentId);
    if (doc.publishStatus !== 'published') {
      throw invalidTransition('Chỉ có thể thu hồi tài liệu đang được xuất bản');
    }

    // 1) xóa vector trước. Nếu Chroma lỗi thì giữ nguyên "published" (vẫn nhất quán).
    await store.deleteByDocument(documentId);

    // 2) rồi mới đổi trạng thái
    await prisma.$transaction(async (tx) => {
      await tx.document.updateMany({
        where: { id: documentId, publishStatus: 'published' },
        data: { publishStatus: 'revoked' },
      });
       await tryGraph(() => unlinkDocumentChunks(documentId, deps), 'gỡ chunk khỏi graph'); // +
      await tx.chunk.updateMany({ where: { documentId }, data: { embeddingId: null } });
    });
  });
}

/** Giáo viên sửa nội dung một chunk khi xem lại. Chỉ cho sửa khi tài liệu KHÔNG đang xuất bản. */
export async function updateChunkText(documentId, chunkId, text, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  if (isBusy(documentId)) {
    throw new AppError('Tài liệu đang được xuất bản/thu hồi, vui lòng thử lại sau', 409, 'DOCUMENT_BUSY');
  }
  const doc = await loadState(prisma, documentId);
  if (doc.publishStatus === 'published') {
    throw new AppError('Hãy thu hồi tài liệu trước khi sửa nội dung', 409, 'DOCUMENT_PUBLISHED');
  }

  const chunk = await prisma.chunk.findFirst({ where: { id: chunkId, documentId } });
  if (!chunk) throw new AppError('Không tìm thấy đoạn tài liệu', 404, 'CHUNK_NOT_FOUND');

  await prisma.chunk.update({ where: { id: chunkId }, data: { text } });
  // Đã duyệt mà bị sửa -> phải duyệt lại
  await prisma.document.updateMany({
    where: { id: documentId, publishStatus: 'reviewed' },
    data: { publishStatus: 'draft' },
  });
}