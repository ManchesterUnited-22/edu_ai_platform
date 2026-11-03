import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 8000),

  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? 'text-embedding-004',

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

  JWT_SECRET: process.env.JWT_SECRET ?? 'change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1h',

  PRACTICE_QUIZ_PER_DAY: Number(process.env.PRACTICE_QUIZ_PER_DAY ?? 5),
  QA_PER_MINUTE: Number(process.env.QA_PER_MINUTE ?? 10),
  OFFICIAL_QUIZ_MAX_ATTEMPTS: Number(process.env.OFFICIAL_QUIZ_MAX_ATTEMPTS ?? 2),
  LINK_CODE_TTL_MINUTES: Number(process.env.LINK_CODE_TTL_MINUTES ?? 30),
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB ?? 20),
};
