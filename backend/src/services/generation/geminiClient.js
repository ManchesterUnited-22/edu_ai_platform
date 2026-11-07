// Gọi Gemini sinh nội dung (REST), có retry và timeout
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 60_000;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gửi một yêu cầu generateContent, tự thử lại khi lỗi tạm thời. Trả về JSON thô của Gemini. */
async function requestGemini(body, deps = {}) {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('Thiếu GEMINI_API_KEY trong .env', 500, 'GEMINI_NOT_CONFIGURED');
  }
  const sleep = deps.sleep ?? defaultSleep;

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/models/${env.GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // timeout / mất mạng -> thử lại
      lastError = error.message;
      await sleep(500 * 2 ** attempt);
      continue;
    }

    if (res.ok) return res.json();

    lastError = `${res.status} ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break; // lỗi phía mình, thử lại cũng vô ích
    await sleep(500 * 2 ** attempt);
  }

  throw new AppError(`Gọi Gemini thất bại: ${lastError}`, 502, 'GENERATION_FAILED');
}

function extractText(data) {
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    const reason = data.promptFeedback?.blockReason ?? candidate?.finishReason ?? 'EMPTY';
    throw new AppError(`Mô hình không trả về nội dung (${reason})`, 422, 'GENERATION_BLOCKED');
  }
  return text;
}

const baseBody = ({ system, prompt, generationConfig }) => {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  return body;
};

/**
 * Sinh văn bản thuần.
 * @param {{system?:string, prompt:string, temperature?:number, maxOutputTokens?:number}} options
 * @param {{sleep?:Function}} deps chỉ để test
 */
export async function generateText(
  { system, prompt, temperature = 0.2, maxOutputTokens = 2048 },
  deps = {},
) {
  const data = await requestGemini(
    baseBody({ system, prompt, generationConfig: { temperature, maxOutputTokens } }),
    deps,
  );
  return extractText(data);
}

/**
 * Sinh dữ liệu có cấu trúc (structured output): Gemini bị ép trả JSON đúng `schema`.
 * Vẫn phải kiểm tra lại kết quả bằng zod ở phía gọi, không tin tuyệt đối vào mô hình.
 * @returns {Promise<unknown>} đối tượng đã parse
 */
export async function generateJson(
  { system, prompt, schema, temperature = 0.4, maxOutputTokens = 8192 },
  deps = {},
) {
  const data = await requestGemini(
    baseBody({
      system,
      prompt,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
    deps,
  );

  const text = extractText(data)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('Mô hình trả về JSON không hợp lệ', 502, 'GENERATION_INVALID');
  }
}