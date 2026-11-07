// Gọi Gemini sinh câu trả lời từ prompt đã dựng
import { generateText } from '../generation/geminiClient.js';

/** @param {{system:string, user:string}} prompt */
export function generateAnswer(prompt) {
  // temperature thấp: ưu tiên bám sát tài liệu hơn là "sáng tạo"
  return generateText({ system: prompt.system, prompt: prompt.user, temperature: 0.2 });
}