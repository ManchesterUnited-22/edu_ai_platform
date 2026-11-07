import { jest } from '@jest/globals';

process.env.GEMINI_API_KEY = 'test-key';
const { embedDocuments, embedQuery } = await import('../../src/services/rag/embedder.js');

const okResponse = (n) => ({
  ok: true,
  status: 200,
  json: async () => ({ embeddings: Array.from({ length: n }, () => ({ values: [0.1, 0.2] })) }),
});

afterEach(() => {
  delete globalThis.fetch;
});

describe('embedder', () => {
  test('embedDocuments gom batch và dùng RETRIEVAL_DOCUMENT', async () => {
    globalThis.fetch = jest.fn(async (url, init) => okResponse(JSON.parse(init.body).requests.length));
    const vectors = await embedDocuments(Array(120).fill('abc'));
    expect(vectors).toHaveLength(120);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3); // 50 + 50 + 20
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.requests[0].taskType).toBe('RETRIEVAL_DOCUMENT');
  });

  test('embedQuery dùng RETRIEVAL_QUERY', async () => {
    globalThis.fetch = jest.fn(async () => okResponse(1));
    const v = await embedQuery('quang hợp là gì');
    expect(v).toEqual([0.1, 0.2]);
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.requests[0].taskType).toBe('RETRIEVAL_QUERY');
  });

  test('lỗi 400 không retry và ném EMBEDDING_FAILED', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 400, text: async () => 'bad' }));
    await expect(embedQuery('x')).rejects.toMatchObject({ code: 'EMBEDDING_FAILED' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});