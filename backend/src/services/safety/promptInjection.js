// Phát hiện/chặn prompt injection trong câu hỏi của người dùng (lớp phòng thủ thứ nhất).
// Lớp thứ hai nằm ở prompt hệ thống: tài liệu và câu hỏi chỉ được coi là DỮ LIỆU.

export const INJECTION_MESSAGE =
  'Mình chỉ có thể trả lời các câu hỏi về nội dung tài liệu của lớp. Bạn hãy đặt câu hỏi liên quan đến bài học nhé.';

// So khớp trên văn bản đã bỏ dấu + hạ chữ thường nên bắt được cả khi gõ không dấu
const PATTERNS = [
  {
    id: 'ignore_instructions_vi',
    re: /(bo qua|quen|huy bo|phot lo)\s+(het|toan bo|tat ca|moi|cac)\s+(huong dan|chi dan|quy tac|chi thi|lenh)/,
  },
  {
    id: 'ignore_previous_vi',
    re: /(bo qua|quen|huy bo|phot lo)\s+(huong dan|chi dan|quy tac|chi thi|lenh)\s+(truoc|o tren|ban dau|cua ban|he thong)/,
  },
  {
    id: 'ignore_instructions_en',
    re: /(ignore|disregard|forget|override).{0,25}(previous|prior|above|earlier|all|your|system).{0,25}(instruction|prompt|rule|message|guideline)/,
  },
  {
    id: 'reveal_prompt_vi',
    re: /(tiet lo|cho (toi|minh) xem|in ra|lap lai|hien thi|doc lai).{0,30}(system prompt|prompt he thong|huong dan he thong|chi dan he thong|huong dan ban dau|quy tac cua ban)/,
  },
  {
    id: 'reveal_prompt_en',
    re: /(reveal|show|print|repeat|leak|output).{0,30}(system prompt|your (instructions|prompt|rules)|initial prompt)/,
  },
  { id: 'jailbreak_keywords', re: /\b(jailbreak|dan mode|developer mode|do anything now)\b/ },
  {
    id: 'new_persona_vi',
    re: /(tu bay gio|tu gio tro di)\s.{0,40}(ban|may)\s+(la|hay|phai|se)\s.{0,40}(khong (bi |co )?(gioi han|han che|rang buoc)|tu do hoan toan)/,
  },
  {
    id: 'new_persona_en',
    re: /(act as|pretend (to be|you are)|from now on,? you).{0,60}(no restrictions|unrestricted|without (any )?(rules|restrictions|limits))/,
  },
  {
    id: 'delimiter_smuggling',
    re: /<\/?\s*(system|assistant|tai_lieu|cau_hoi)\s*>|\[\/?inst\]|#{3}\s*(system|instruction)/,
  },
];

function normalizeForMatch(text) {
  return text
    .normalize('NFD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
}

/** @returns {{flagged:boolean, reasons:string[]}} */
export function detectPromptInjection(text) {
  const normalized = normalizeForMatch(String(text ?? ''));
  const reasons = PATTERNS.filter(({ re }) => re.test(normalized)).map(({ id }) => id);
  return { flagged: reasons.length > 0, reasons };
}