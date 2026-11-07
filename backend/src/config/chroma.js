// Kết nối ChromaDB
import { ChromaClient } from 'chromadb';
import { env } from './env.js';

const url = new URL(env.CHROMA_URL);

export const chromaClient = new ChromaClient({
  host: url.hostname,
  port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
  ssl: url.protocol === 'https:',
});

export const CHUNK_COLLECTION = 'edu_chunks';

let collectionPromise;

/** Lấy (hoặc tạo) collection dùng độ đo cosine. Embedding do mình tự cấp nên tắt embeddingFunction. */
export function getChunkCollection() {
  if (!collectionPromise) {
    collectionPromise = chromaClient
      .getOrCreateCollection({
        name: CHUNK_COLLECTION,
        configuration: { hnsw: { space: 'cosine' } },
        embeddingFunction: null,
      })
      .catch((error) => {
        collectionPromise = undefined; // cho phép thử lại lần sau
        throw error;
      });
  }
  return collectionPromise;
}