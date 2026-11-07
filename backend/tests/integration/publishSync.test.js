// Xuất bản/thu hồi với ChromaDB THẬT (embedding giả, Postgres giả). Không có Chroma thì tự bỏ qua.
import { jest } from '@jest/globals';
import { createFakePrisma } from '../helpers/fakePrisma.js';

process.env.CHROMA_URL = process.env.CHROMA_URL ?? 'http://localhost:8001';
const { publishDocument, reviewDocument, unpublishDocument } = await import(
  '../../src/services/publishing/publishService.js'
);
const { computeSyncDrift } = await import('../../src/services/publishing/vectorSync.js');
const store = await import('../../src/services/rag/vectorStore.js');
const { chromaClient } = await import('../../src/config/chroma.js');

let chromaUp = true;
try {
  await chromaClient.heartbeat();
} catch {
  chromaUp = false;
}
const maybe = chromaUp ? describe : describe.skip;
jest.setTimeout(20000);

// Embedding giả: "quang hợp" gần [1,0,0], "hô hấp" gần [0,1,0]
const fakeEmbed = async (texts) =>
  texts.map((t) => (t.toLowerCase().includes('quang') ? [1, 0, 0] : [0, 1, 0]));

maybe('publish/unpublish đồng bộ với ChromaDB thật', () => {
  const docId = 'it-doc-1';
  const prisma = createFakePrisma({
    documents: [{ id: docId, classId: 'it-class', fileName: 'a.pdf', processStatus: 'ready', publishStatus: 'draft' }],
    chunks: [
      { id: 'it-k1', documentId: docId, chunkIndex: 0, text: 'Quang hợp tạo chất hữu cơ', pageNumber: 1 },
      { id: 'it-k2', documentId: docId, chunkIndex: 1, text: 'Hô hấp giải phóng năng lượng', pageNumber: 2 },
    ],
  });
  const deps = { prisma, embedDocuments: fakeEmbed }; // store mặc định = Chroma thật

  afterAll(() => store.deleteByDocument(docId));

  test('chưa xuất bản -> RAG không tìm thấy gì', async () => {
    await reviewDocument(docId, deps);
    expect(await store.queryChunks({ embedding: [1, 0, 0], classId: 'it-class', topK: 5 })).toEqual([]);
  });

  test('xuất bản -> tìm được, có trang để trích dẫn; Postgres và Chroma khớp', async () => {
    await publishDocument(docId, deps);
    const res = await store.queryChunks({ embedding: [1, 0, 0], classId: 'it-class', topK: 2 });
    expect(res[0].id).toBe('it-k1');
    expect(res[0].pageNumber).toBe(1);
    expect(res[0].score).toBeCloseTo(1, 3);
    expect((await computeSyncDrift(deps)).problems.filter((p) => p.documentId === docId)).toEqual([]);
  });

  test('thu hồi -> RAG không còn tìm thấy nội dung cũ', async () => {
    await unpublishDocument(docId, deps);
    expect(await store.queryChunks({ embedding: [1, 0, 0], classId: 'it-class', topK: 5 })).toEqual([]);
  });
});