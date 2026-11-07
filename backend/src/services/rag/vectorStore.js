// ChromaDB: upsert/delete/query theo lớp, tài liệu
import { getChunkCollection } from '../../config/chroma.js';

/**
 * @param {{id:string, embedding:number[], text:string,
 *          classId:string, documentId:string, chunkIndex:number, pageNumber?:number|null}[]} items
 */
export async function upsertChunks(items) {
  if (!items.length) return;
  const collection = await getChunkCollection();
  await collection.upsert({
    ids: items.map((i) => i.id),
    embeddings: items.map((i) => i.embedding),
    documents: items.map((i) => i.text),
    metadatas: items.map((i) => ({
      classId: i.classId,
      documentId: i.documentId,
      chunkIndex: i.chunkIndex,
      // Chroma không nhận null -> dùng 0 khi không có số trang
      pageNumber: i.pageNumber ?? 0,
    })),
  });
}

/** Xóa toàn bộ vector của một tài liệu (khi thu hồi / sửa / xóa). */
export async function deleteByDocument(documentId) {
  const collection = await getChunkCollection();
  await collection.delete({ where: { documentId } });
}

/** Danh sách id vector hiện có của một tài liệu (dùng cho script kiểm tra đồng bộ). */
export async function listIdsByDocument(documentId) {
  const collection = await getChunkCollection();
  const res = await collection.get({ where: { documentId }, include: [] });
  return res.ids;
}

/**
 * Tìm top-K đoạn gần nghĩa nhất, CHỈ trong đúng lớp.
 * Vector DB chỉ chứa tài liệu đã publish nên không cần lọc thêm trạng thái.
 * @returns {{id:string, text:string, score:number, documentId:string,
 *            chunkIndex:number, pageNumber:number|null}[]} score = cosine similarity (0..1)
 */
export async function queryChunks({ embedding, classId, topK }) {
  const collection = await getChunkCollection();
  const res = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: { classId },
    include: ['documents', 'metadatas', 'distances'],
  });

  const ids = res.ids[0] ?? [];
  return ids.map((id, i) => {
    const meta = res.metadatas[0][i] ?? {};
    const distance = res.distances[0][i] ?? 1;
    return {
      id,
      text: res.documents[0][i] ?? '',
      score: Math.max(0, Math.min(1, 1 - distance)), // cosine distance -> similarity
      documentId: meta.documentId,
      chunkIndex: meta.chunkIndex,
      pageNumber: meta.pageNumber ? meta.pageNumber : null,
    };
  });
}

/**
 * Toàn bộ vector đang có trong Chroma, gom theo tài liệu.
 * Dùng cho script kiểm tra/sửa đồng bộ giữa Postgres và vector DB.
 * @returns {Promise<Map<string, string[]>>} documentId -> danh sách id vector
 */
export async function listAllVectorIds() {
  const collection = await getChunkCollection();
  const byDocument = new Map();
  const PAGE = 500;

  for (let offset = 0; ; offset += PAGE) {
    const res = await collection.get({ limit: PAGE, offset, include: ['metadatas'] });
    res.ids.forEach((id, i) => {
      const documentId = res.metadatas[i]?.documentId ?? '(không rõ)';
      if (!byDocument.has(documentId)) byDocument.set(documentId, []);
      byDocument.get(documentId).push(id);
    });
    if (res.ids.length < PAGE) break;
  }
  return byDocument;
}