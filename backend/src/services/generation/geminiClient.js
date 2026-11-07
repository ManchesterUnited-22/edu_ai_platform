// Gọi Gemini sinh nội dung (REST), có retry và timeout
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sinh văn bản thuần.
 * @param {{system?:string, prompt:string, temperature?:number, maxOutputTokens?:number}} options
 * @param {{sleep?:Function}} deps chỉ để test
 */
export async function generateText(
  { system, prompt, temperature = 0.2, maxOutputTokens = 2048 },
  deps = {},
) {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('Thiếu GEMINI_API_KEY trong .env', 500, 'GEMINI_NOT_CONFIGURED');
  }
  const sleep = deps.sleep ?? defaultSleep;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

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

    if (res.ok) return extractText(await res.json());

    lastError = `${res.status} ${(await res.text()).slice(0, 200)}`;
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
    throw new AppError(
      `Mô hình không trả về nội dung (${reason})`,
      422,
      'GENERATION_BLOCKED',
    );
  }
  return text;
}