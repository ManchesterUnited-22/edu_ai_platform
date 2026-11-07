// Gắn trích dẫn nguồn (đoạn tài liệu + vị trí)

const MARKER = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
const EXCERPT_LENGTH = 240;

const toCitation = (index, hit) => ({
  index,
  chunkId: hit.id,
  documentId: hit.documentId,
  fileName: hit.fileName,
  pageNumber: hit.pageNumber ?? null,
  excerpt: hit.text.length > EXCERPT_LENGTH ? `${hit.text.slice(0, EXCERPT_LENGTH)}…` : hit.text,
  score: Math.round(hit.score * 1000) / 1000,
});

/**
 * Chuẩn hóa các dấu [n] trong câu trả lời và dựng danh sách trích dẫn.
 *  - bỏ số nguồn không tồn tại (mô hình tự bịa), đổi "[1, 2]" thành "[1][2]"
 *  - chỉ trả về những nguồn thực sự được trích
 *  - nếu mô hình quên trích dẫn: dùng toàn bộ nguồn đã cấp và đánh dấu inferred = true
 * @returns {{answer:string, citations:object[], inferred:boolean}}
 */
export function applyCitations(rawAnswer, evidence) {
  const used = [];

  const answer = rawAnswer
    .replace(MARKER, (_, list) => {
      const valid = list
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => n >= 1 && n <= evidence.length);
      valid.forEach((n) => {
        if (!used.includes(n)) used.push(n);
      });
      return valid.map((n) => `[${n}]`).join('');
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  if (used.length === 0) {
    return {
      answer,
      citations: evidence.map((hit, i) => toCitation(i + 1, hit)),
      inferred: true,
    };
  }
  return {
    answer,
    citations: used.sort((a, b) => a - b).map((n) => toCitation(n, evidence[n - 1])),
    inferred: false,
  };
}