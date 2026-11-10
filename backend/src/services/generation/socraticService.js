// Gia sư Socratic: gợi mở dần, không đưa đáp án cuối
import fs from 'node:fs';
import { AppError } from '../../utils/AppError.js';
import { checkTextSafety } from '../safety/contentSafety.js';
import { detectPromptInjection, INJECTION_MESSAGE } from '../safety/promptInjection.js';
import { guardedReply } from '../safety/socraticGuard.js';
import { generateText } from './geminiClient.js';

const SYSTEM_PROMPT = fs
  .readFileSync(new URL('../../prompts/socratic.txt', import.meta.url), 'utf8')
  .trim();

const LEVELS = {
  1: 'Mức 1: chưa gợi ý cách giải. Hỏi học sinh đề cho gì, yêu cầu gì và em đã thử gì.',
  2: 'Mức 2: gợi ý hướng làm hoặc kiến thức cần dùng, rồi hỏi em áp dụng cho bước đầu tiên.',
  3: 'Mức 3: gợi ý cụ thể cho BƯỚC TIẾP THEO (có thể nhắc công thức), vẫn để em tự tính, không nêu kết quả cuối.',
};

const neutralizeTags = (text) => text.replace(/<\/?\s*(bai_toan|hoi_thoai)\s*>/gi, '');

export const hintLevelFor = (messages) =>
  Math.min(3, Math.max(1, messages.filter((m) => m.role === 'student').length));

export function buildSocraticPrompt({ problem, messages }) {
  const level = hintLevelFor(messages);
  const transcript = messages
    .map((m) => `${m.role === 'student' ? 'Học sinh' : 'Gia sư'}: ${neutralizeTags(m.content)}`)
    .join('\n');
  return {
    level,
    system: SYSTEM_PROMPT,
    user: `<bai_toan>\n${neutralizeTags(problem)}\n</bai_toan>\n\n<hoi_thoai>\n${transcript || '(chưa có)'}\n</hoi_thoai>\n\n${LEVELS[level]}\nHãy viết lượt phản hồi tiếp theo của gia sư.`,
  };
}

const refused = (reason, reply) => ({ reply, hintLevel: null, refused: true, reason });

export async function socraticStep({ problem, messages = [] }, deps = {}) {
  const last = messages.at(-1);
  if (last && last.role !== 'student') {
    throw new AppError('Tin nhắn cuối phải là của học sinh', 400, 'VALIDATION_ERROR');
  }

  // Kiểm tra đề bài và MỌI lời học sinh, vì client gửi lại toàn bộ lịch sử
  const studentText = [problem, ...messages.filter((m) => m.role === 'student').map((m) => m.content)];
  if (studentText.some((t) => detectPromptInjection(t).flagged)) {
    return refused('injection', INJECTION_MESSAGE);
  }
  const unsafe = studentText.map((t) => checkTextSafety(t)).find((s) => !s.safe);
  if (unsafe) return refused('unsafe', unsafe.message);

  const generate = deps.generate ?? ((p) => generateText({ system: p.system, prompt: p.user, temperature: 0.3, maxOutputTokens: 2048 }));
  const prompt = buildSocraticPrompt({ problem, messages });
  const { reply, guarded } = await guardedReply(generate, prompt);
  return { reply, hintLevel: prompt.level, refused: false, reason: guarded ? 'answer_blocked' : null };
}