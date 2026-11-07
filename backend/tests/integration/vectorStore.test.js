// Cần ChromaDB đang chạy (docker compose up chroma). Không có thì tự bỏ qua.
import { jest } from '@jest/globals';

process.env.CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8001';
const { upsertChunks, queryChunks, deleteByDocument, listIdsByDocument } = await import(
  '../../src/services/rag/vectorStore.js'
);
const { chromaClient } = await import('../../src/config/chroma.js');

let chromaUp = true;
try {
  await chromaClient.heartbeat();
} catch {
  chromaUp = false;
}
const maybe = chromaUp ? describe : describe.skip;

jest.setTimeout(20000);

maybe('vectorStore (ChromaDB thật)', () => {
  const classA = 'class-a';
  const classB = 'class-b';
  const docA = 'doc-a';

  beforeAll(async () => {
    await upsertChunks([
      { id: 'c1', embedding: [1, 0, 0], text: 'quang hợp', classId: classA, documentId: docA, chunkIndex: 0, pageNumber: 3 },
      { id: 'c2', embedding: [0, 1, 0], text: 'hô hấp', classId: classA, documentId: docA, chunkIndex: 1, pageNumber: null },
      { id: 'c3', embedding: [1, 0, 0], text: 'lớp khác', classId: classB, documentId: 'doc-b', chunkIndex: 0 },
    ]);
  });

  afterAll(async () => {
    await deleteByDocument(docA);
    await deleteByDocument('doc-b');
  });

  test('trả về đoạn gần nhất với score cosine ~1', async () => {
    const res = await queryChunks({ embedding: [1, 0, 0], classId: classA, topK: 2 });
    expect(res[0].id).toBe('c1');
    expect(res[0].score).toBeCloseTo(1, 3);
    expect(res[0].pageNumber).toBe(3);
    expect(res[1].score).toBeCloseTo(0, 3);
    expect(res[1].pageNumber).toBeNull();
  });

  test('chỉ tìm trong đúng lớp (không lộ tài liệu lớp khác)', async () => {
    const res = await queryChunks({ embedding: [1, 0, 0], classId: classA, topK: 5 });
    expect(res.map((r) => r.id)).not.toContain('c3');
  });

  test('deleteByDocument xóa sạch vector của tài liệu', async () => {
    await deleteByDocument(docA);
    expect(await listIdsByDocument(docA)).toEqual([]);
    const res = await queryChunks({ embedding: [1, 0, 0], classId: classA, topK: 5 });
    expect(res).toEqual([]);
  });
});