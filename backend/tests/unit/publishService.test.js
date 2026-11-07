import { jest } from '@jest/globals';
import {
  publishDocument,
  reviewDocument,
  unpublishDocument,
  updateChunkText,
} from '../../src/services/publishing/publishService.js';
import { computeSyncDrift, reindexAllPublished } from '../../src/services/publishing/vectorSync.js';
import { createFakePrisma, createFakeStore } from '../helpers/fakePrisma.js';

const fakeEmbed = async (texts) => texts.map((t) => [t.length, 1, 0]);

function setup(docOverrides = {}) {
  const prisma = createFakePrisma({
    documents: [
      { id: 'd1', classId: 'c1', fileName: 'a.pdf', processStatus: 'ready', publishStatus: 'draft', ...docOverrides },
    ],
    chunks: [
      { id: 'k1', documentId: 'd1', chunkIndex: 0, text: 'Quang hợp' },
      { id: 'k2', documentId: 'd1', chunkIndex: 1, text: 'Hô hấp' },
    ],
  });
  const store = createFakeStore();
  const deps = { prisma, store, embedDocuments: fakeEmbed };
  return { prisma, store, deps, doc: () => prisma.db.documents[0] };
}

describe('review -> publish -> unpublish', () => {
  test('luồng đầy đủ: vector chỉ tồn tại khi đang published', async () => {
    const { deps, store, doc, prisma } = setup();

    await reviewDocument('d1', deps);
    expect(doc().publishStatus).toBe('reviewed');
    expect(store.byDoc.has('d1')).toBe(false);

    await publishDocument('d1', deps);
    expect(doc().publishStatus).toBe('published');
    expect(doc().publishedAt).toBeInstanceOf(Date);
    expect([...store.byDoc.get('d1').keys()].sort()).toEqual(['k1', 'k2']);
    expect(prisma.db.chunks.every((c) => c.embeddingId === c.id)).toBe(true);

    await unpublishDocument('d1', deps);
    expect(doc().publishStatus).toBe('revoked');
    expect(store.byDoc.has('d1')).toBe(false);
    expect(prisma.db.chunks.every((c) => c.embeddingId === null)).toBe(true);
  });

  test('không được xuất bản khi chưa duyệt', async () => {
    const { deps, store } = setup();
    await expect(publishDocument('d1', deps)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(store.byDoc.size).toBe(0);
  });

  test('không duyệt được khi tài liệu chưa xử lý xong', async () => {
    const { deps } = setup({ processStatus: 'processing' });
    await expect(reviewDocument('d1', deps)).rejects.toMatchObject({ code: 'DOCUMENT_NOT_READY' });
  });

  test('thu hồi xong phải duyệt lại mới xuất bản được', async () => {
    const { deps, doc } = setup({ publishStatus: 'revoked' });
    await expect(publishDocument('d1', deps)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    await reviewDocument('d1', deps);
    await publishDocument('d1', deps);
    expect(doc().publishStatus).toBe('published');
  });

  test('embedding lỗi -> vẫn "reviewed", vector DB không bị đụng tới', async () => {
    const { deps, store, doc } = setup({ publishStatus: 'reviewed' });
    deps.embedDocuments = async () => {
      throw new Error('Gemini sập');
    };
    await expect(publishDocument('d1', deps)).rejects.toThrow('Gemini sập');
    expect(doc().publishStatus).toBe('reviewed');
    expect(store.byDoc.size).toBe(0);
  });

  test('DB lỗi sau khi ghi vector -> gỡ vector, không để lệch', async () => {
    const { deps, store, prisma, doc } = setup({ publishStatus: 'reviewed' });
    prisma.failTransaction = true;
    await expect(publishDocument('d1', deps)).rejects.toThrow('DB lỗi');
    expect(store.byDoc.has('d1')).toBe(false);
    expect(doc().publishStatus).toBe('reviewed');
  });

  test('Chroma lỗi khi thu hồi -> vẫn "published" (không báo thu hồi giả)', async () => {
    const { deps, store, doc } = setup({ publishStatus: 'reviewed' });
    await publishDocument('d1', deps);
    store.deleteByDocument = async () => {
      throw new Error('Chroma lỗi');
    };
    await expect(unpublishDocument('d1', deps)).rejects.toThrow('Chroma lỗi');
    expect(doc().publishStatus).toBe('published');
  });

  test('hai lần xuất bản đồng thời: chỉ một lần chạy', async () => {
    const { deps } = setup({ publishStatus: 'reviewed' });
    const slowEmbed = jest.fn(async (t) => {
      await new Promise((r) => setTimeout(r, 20));
      return fakeEmbed(t);
    });
    deps.embedDocuments = slowEmbed;
    const results = await Promise.allSettled([publishDocument('d1', deps), publishDocument('d1', deps)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason.code).toBe('DOCUMENT_BUSY');
    expect(slowEmbed).toHaveBeenCalledTimes(1);
  });
});

describe('updateChunkText', () => {
  test('sửa khi đang published bị từ chối', async () => {
    const { deps } = setup({ publishStatus: 'published' });
    await expect(updateChunkText('d1', 'k1', 'mới', deps)).rejects.toMatchObject({ code: 'DOCUMENT_PUBLISHED' });
  });

  test('sửa tài liệu đã duyệt -> quay về draft, phải duyệt lại', async () => {
    const { deps, doc, prisma } = setup({ publishStatus: 'reviewed' });
    await updateChunkText('d1', 'k1', 'Quang hợp (đã sửa)', deps);
    expect(doc().publishStatus).toBe('draft');
    expect(prisma.db.chunks.find((c) => c.id === 'k1').text).toBe('Quang hợp (đã sửa)');
  });

  test('chunk không thuộc tài liệu -> 404', async () => {
    const { deps } = setup();
    await expect(updateChunkText('d1', 'zzz', 'x', deps)).rejects.toMatchObject({ code: 'CHUNK_NOT_FOUND' });
  });
});

describe('computeSyncDrift / reindexAllPublished', () => {
  test('đồng bộ -> không có điểm lệch', async () => {
    const { deps } = setup({ publishStatus: 'reviewed' });
    await publishDocument('d1', deps);
    expect((await computeSyncDrift(deps)).problems).toEqual([]);
  });

  test('phát hiện vector bị mất và vector mồ côi, reindex sửa được', async () => {
    const { deps, store } = setup({ publishStatus: 'reviewed' });
    await publishDocument('d1', deps);

    store.byDoc.get('d1').delete('k2'); // mất 1 vector
    store.byDoc.set('ghost', new Map([['g1', { id: 'g1' }]])); // vector của tài liệu không tồn tại

    const { problems } = await computeSyncDrift(deps);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'published_mismatch', documentId: 'd1', missing: 1 }),
        expect.objectContaining({ type: 'orphan_vectors', documentId: 'ghost', count: 1 }),
      ]),
    );

    expect(await reindexAllPublished(deps)).toEqual({ reindexed: 1, orphanDocs: 1 });
    expect((await computeSyncDrift(deps)).problems).toEqual([]);
  });
});