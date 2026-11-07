// Embedding bằng Gemini (model cấu hình ở EMBEDDING_MODEL, mặc định gemini-embedding-001)
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const BATCH_SIZE = 50; // API cho tối đa 100 yêu cầu/lần
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function batchEmbed(texts, taskType) {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('Thiếu GEMINI_API_KEY trong .env', 500, 'GEMINI_NOT_CONFIGURED');
  }

  const model = env.EMBEDDING_MODEL;
  const body = {
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: env.EMBEDDING_DIMENSIONS,
    })),
  };

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const res = await fetch(`${BASE_URL}/models/${model}:batchEmbedContents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
        throw new AppError('Gemini trả về embedding không hợp lệ', 502, 'EMBEDDING_FAILED');
      }
      return data.embeddings.map((e) => e.values);
    }

    lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable) break;
    await sleep(500 * 2 ** attempt);
  }

  throw new AppError(`Gọi embedding thất bại: ${lastError}`, 502, 'EMBEDDING_FAILED');
}

/** Vector hóa danh sách đoạn tài liệu (dùng khi lưu vào vector DB). */
export async function embedDocuments(texts) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    vectors.push(...(await batchEmbed(batch, 'RETRIEVAL_DOCUMENT')));
  }
  return vectors;
}

/** Vector hóa một câu hỏi (dùng khi tìm kiếm). */
export async function embedQuery(text) {
  const [vector] = await batchEmbed([text], 'RETRIEVAL_QUERY');
  return vector;
}