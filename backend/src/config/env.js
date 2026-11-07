import 'dotenv/config';
import path from 'node:path';
// Bắt buộc có JWT_SECRET, trừ khi đang chạy test (Jest tự đặt NODE_ENV=test)
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV !== 'test') {
  throw new Error('Thiếu JWT_SECRET trong backend/.env');
}

export const env = {
  PORT: Number(process.env.PORT ?? 8000),

  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? 'gemini-embedding-001',
  EMBEDDING_DIMENSIONS: Number(process.env.EMBEDDING_DIMENSIONS ?? 768),

  CHUNK_SIZE: Number(process.env.CHUNK_SIZE ?? 800),
  CHUNK_OVERLAP: Number(process.env.CHUNK_OVERLAP ?? 100),
  TOP_K: Number(process.env.TOP_K ?? 5),
  CONFIDENCE_THRESHOLD: Number(process.env.CONFIDENCE_THRESHOLD ?? 0.65),

  DATABASE_URL: process.env.DATABASE_URL ?? '',
  CHROMA_URL: process.env.CHROMA_URL ?? 'http://localhost:8001',
  GRAPH_ENABLED: (process.env.GRAPH_ENABLED ?? 'false') === 'true',
  NEO4J_URI: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
  NEO4J_USER: process.env.NEO4J_USER ?? 'neo4j',
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD ?? '',

  JWT_SECRET: jwtSecret ?? 'test-only-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',

  PRACTICE_QUIZ_PER_DAY: Number(process.env.PRACTICE_QUIZ_PER_DAY ?? 5),
  QA_PER_MINUTE: Number(process.env.QA_PER_MINUTE ?? 10),
  OFFICIAL_QUIZ_MAX_ATTEMPTS: Number(process.env.OFFICIAL_QUIZ_MAX_ATTEMPTS ?? 2),
  LINK_CODE_TTL_MINUTES: Number(process.env.LINK_CODE_TTL_MINUTES ?? 30),
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB ?? 20),
    // Chạy local: <repo>/data/uploads (lệnh chạy ở backend/). Docker đặt UPLOAD_DIR=/app/data/uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), '..', 'data', 'uploads'),
};