// Gọi mô hình ở chế độ structured output rồi KIỂM TRA LẠI bằng zod, thử lại nếu sai cấu trúc
import { AppError } from '../../utils/AppError.js';
import { generateJson as defaultGenerateJson } from './geminiClient.js';

export async function generateValidated(
  { system, prompt, jsonSchema, zodSchema, attempts = 2 },
  deps = {},
) {
  const generate = deps.generateJson ?? defaultGenerateJson;
  let lastError = 'không rõ';

  for (let i = 0; i < attempts; i += 1) {
    try {
      const raw = await generate({ system, prompt, schema: jsonSchema });
      const parsed = zodSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.') || '(gốc)'}: ${issue.message}`)
        .join('; ');
    } catch (error) {
      if (error.code !== 'GENERATION_INVALID') throw error; // lỗi mạng/key thì không thử lại ở đây
      lastError = error.message;
    }
  }
  throw new AppError(`AI trả về dữ liệu không đúng cấu trúc (${lastError})`, 502, 'GENERATION_INVALID');
}