// Đồng bộ vector DB với Postgres: chỉ tài liệu PUBLISHED mới có vector trong Chroma.
// Quy ước: id vector = id của Chunk.
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { embedDocuments as defaultEmbed } from '../rag/embedder.js';
import * as defaultStore from '../rag/vectorStore.js';

/**
 * Embed toàn bộ chunk của tài liệu và ghi vào vector DB (thay thế hoàn toàn bản cũ).
 * Nếu embedding lỗi thì vector DB không bị đụng tới.
 */
export async function indexDocument(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const embed = deps.embedDocuments ?? defaultEmbed;
  const store = deps.store ?? defaultStore;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, classId: true },
  });
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
    select: { id: true, chunkIndex: true, text: true, pageNumber: true },
  });
  if (!doc || chunks.length === 0) {
    throw new AppError('Tài liệu chưa có nội dung để lập chỉ mục', 409, 'NO_CHUNKS');
  }

  const vectors = await embed(chunks.map((c) => c.text)); // bước dễ lỗi nhất làm trước
  await store.deleteByDocument(documentId); // xóa vector cũ, không để sót chunk đã bị thay
  await store.upsertChunks(
    chunks.map((c, i) => ({
      id: c.id,
      embedding: vectors[i],
      text: c.text,
      classId: doc.classId,
      documentId,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
    })),
  );
  return chunks.length;
}

export async function removeDocumentVectors(documentId, deps = {}) {
  const store = deps.store ?? defaultStore;
  await store.deleteByDocument(documentId);
}

/** So sánh Postgres với Chroma, trả về danh sách điểm lệch (rỗng = đồng bộ). */
export async function computeSyncDrift(deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const store = deps.store ?? defaultStore;

  const vectors = await store.listAllVectorIds();
  const published = await prisma.document.findMany({
    where: { publishStatus: 'published' },
    select: { id: true, fileName: true, chunks: { select: { id: true } } },
  });
  const publishedIds = new Set(published.map((d) => d.id));
  const problems = [];

  for (const doc of published) {
    const expected = new Set(doc.chunks.map((c) => c.id));
    const actual = new Set(vectors.get(doc.id) ?? []);
    const missing = [...expected].filter((id) => !actual.has(id)).length;
    const extra = [...actual].filter((id) => !expected.has(id)).length;
    if (missing || extra) {
      problems.push({ type: 'published_mismatch', documentId: doc.id, fileName: doc.fileName, missing, extra });
    }
  }
  for (const [documentId, ids] of vectors) {
    if (!publishedIds.has(documentId)) {
      problems.push({ type: 'orphan_vectors', documentId, count: ids.length });
    }
  }
  return { publishedCount: published.length, problems };
}

/** Dựng lại vector DB theo Postgres: index lại mọi tài liệu published, xóa vector mồ côi. */
export async function reindexAllPublished(deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const store = deps.store ?? defaultStore;

  const published = await prisma.document.findMany({
    where: { publishStatus: 'published' },
    select: { id: true },
  });
  const publishedIds = new Set(published.map((d) => d.id));

  const vectors = await store.listAllVectorIds();
  let orphanDocs = 0;
  for (const documentId of vectors.keys()) {
    if (!publishedIds.has(documentId)) {
      await store.deleteByDocument(documentId);
      orphanDocs += 1;
    }
  }

  let reindexed = 0;
  for (const doc of published) {
    await indexDocument(doc.id, deps);
    reindexed += 1;
  }
  return { reindexed, orphanDocs };
}