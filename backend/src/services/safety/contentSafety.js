// Kiểm duyệt nội dung bằng luật (mức cơ bản) trên văn bản đã bỏ dấu.
// Áp dụng cho: câu hỏi hỏi-đáp, Socratic, và văn bản trích từ tài liệu/ảnh (OCR).
import { normalizeForMatch } from './promptInjection.js';

export const SAFETY_MESSAGE =
  'Nội dung này không phù hợp với môi trường học tập nên mình không thể hỗ trợ. Bạn hãy đặt câu hỏi liên quan đến bài học nhé.';

export const SELF_HARM_MESSAGE =
  'Mình rất tiếc khi nghe điều này. Nếu bạn đang rất buồn hoặc muốn làm đau bản thân, hãy nói ngay với bố mẹ, thầy cô hoặc một người lớn bạn tin tưởng. Bạn cũng có thể gọi tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí).';

const RULES = [
  {
    category: 'sexual',
    re: /\b(porn|hentai|phim sex|clip sex|video sex|anh nong|anh sex|khieu dam|truyen sex)\b/,
  },
  {
    category: 'self_harm',
    re: /(cach|lam sao|lam the nao|huong dan|phuong phap).{0,25}(tu tu|tu sat|cat tay|tu lam dau|ket lieu)|(muon|toi se|em se|minh se).{0,10}(chet|tu tu|tu sat)|\b(how to|ways to).{0,15}(kill myself|commit suicide|self.?harm)\b/,
  },
  {
    category: 'weapons_drugs',
    re: /(cach|huong dan|cong thuc|lam sao).{0,25}(che tao|dieu che|lam ra|san xuat|tu che).{0,25}(bom|thuoc no|chat no|vu khi|sung|ma tuy|thuoc lac|heroin|meth)/,
  },
  {
    category: 'violence',
    re: /(cach|huong dan|lam sao).{0,25}(giet|sat hai|hanh hung|bat coc).{0,20}(nguoi|ban|co giao|thay giao|bao ve)/,
  },
];

/**
 * @param {string} text
 * @param {{skip?: string[]}} options bỏ qua một số nhóm (vd: tài liệu văn học có thể nhắc tự tử)
 * @returns {{safe:boolean, categories:string[], message:string|null}}
 */
export function checkTextSafety(text, { skip = [] } = {}) {
  const normalized = normalizeForMatch(String(text ?? ''));
  const categories = RULES.filter(({ category, re }) => !skip.includes(category) && re.test(normalized)).map(
    ({ category }) => category,
  );
  if (categories.length === 0) return { safe: true, categories, message: null };
  return {
    safe: false,
    categories,
    message: categories.includes('self_harm') ? SELF_HARM_MESSAGE : SAFETY_MESSAGE,
  };
}