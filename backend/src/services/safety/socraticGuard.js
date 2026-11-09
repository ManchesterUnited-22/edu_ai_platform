// Chặn đưa đáp án cuối trong chế độ Socratic
import { normalizeForMatch } from './promptInjection.js';

export const SOCRATIC_FALLBACK =
  'Mình chưa thể đưa đáp án, nhưng mình sẽ giúp bạn tự tìm ra nhé. Bạn hãy viết lại đề bài cho cô/thầy biết: đề cho những dữ kiện nào và yêu cầu tìm gì?';

const LEAK_PATTERNS = [
  /(dap an|dap so|ket qua cuoi cung|ket qua cua bai).{0,15}(la|bang|:)/,
  /(nghiem cua (phuong trinh|he phuong trinh|bat phuong trinh)).{0,12}(la|bang|:)/,
  /(vay|suy ra|do do|=>)\s*[a-z]\s*=\s*[-+]?\d/,
  /\b(the answer is|final answer)\b/,
];

/** Heuristic: phát hiện câu trả lời của AI lộ đáp án. Không hoàn hảo nên cần cả lời nhắc trong prompt. */
export function leaksFinalAnswer(reply) {
  const normalized = normalizeForMatch(String(reply ?? ''));
  return LEAK_PATTERNS.some((re) => re.test(normalized));
}

/** Gọi `generate(promptObj)`; nếu lộ đáp án thì thử lại một lần với lời nhắc chặt hơn, vẫn lộ thì dùng câu dự phòng. */
export async function guardedReply(generate, prompt) {
  const first = await generate(prompt);
  if (!leaksFinalAnswer(first)) return { reply: first, guarded: false };

  const retry = await generate({
    ...prompt,
    user: `${prompt.user}\n\nLưu ý: lần trước bạn đã lộ đáp án. Chỉ đặt MỘT câu hỏi gợi mở, tuyệt đối không nêu đáp án hay kết quả.`,
  });
  if (!leaksFinalAnswer(retry)) return { reply: retry, guarded: true };
  return { reply: SOCRATIC_FALLBACK, guarded: true };
}