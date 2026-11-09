// Hit-rate@K, Precision@K, Recall@K, MRR, tỉ lệ từ chối đúng
import { normalizeForMatch } from '../backend/src/services/safety/promptInjection.js';

const norm = (s) => normalizeForMatch(String(s ?? ''));
const round4 = (n) => Math.round(n * 10000) / 10000;
const avg = (xs) => (xs.length ? round4(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Đoạn "đúng" = thuộc tài liệu mong đợi (khớp id HOẶC tên file) và chứa gợi ý (nếu có). */
export function isRelevant(chunk, row) {
  const expected = norm(row.expectedDocumentId);
  if (!expected) return false;
  const sameDoc = norm(chunk.documentId) === expected || norm(chunk.fileName) === expected;
  const hint = norm(row.expectedChunkHint);
  return sameDoc && (!hint || norm(chunk.text).includes(hint));
}

/** Số đoạn đúng trong toàn bộ tài liệu đã publish của lớp (mẫu số của recall). */
export const countRelevant = (chunks, row) => chunks.filter((c) => isRelevant(c, row)).length;

/**
 * @param {{row:object, hits:object[], relevantTotal?:number, k:number, threshold:number}} input
 * hits: kết quả retrieve, đã sắp theo điểm giảm dần
 */
export function evaluateRow({ row, hits, relevantTotal = 0, k, threshold }) {
  const top = hits.slice(0, k);
  const topScore = top[0]?.score ?? 0;
  const answered = topScore >= threshold; // hệ thống có chịu trả lời hay từ chối
  const base = {
    id: row.id,
    question: row.question,
    answerable: row.answerable,
    topScore: round4(topScore),
    answered,
  };

  if (!row.answerable) return { ...base, correctRefusal: !answered };

  const flags = top.map((hit) => isRelevant(hit, row));
  const relevantRetrieved = flags.filter(Boolean).length;
  const firstRank = flags.indexOf(true);
  return {
    ...base,
    hit: relevantRetrieved > 0,
    precision: top.length ? relevantRetrieved / top.length : 0,
    recall: relevantTotal ? Math.min(1, relevantRetrieved / relevantTotal) : 0,
    reciprocalRank: firstRank >= 0 ? 1 / (firstRank + 1) : 0,
    relevantTotal,
  };
}

export function aggregate(results) {
  const answerable = results.filter((r) => r.answerable);
  const unanswerable = results.filter((r) => !r.answerable);
  return {
    answerable: answerable.length,
    unanswerable: unanswerable.length,
    hitRate: avg(answerable.map((r) => (r.hit ? 1 : 0))),
    precision: avg(answerable.map((r) => r.precision)),
    recall: avg(answerable.map((r) => r.recall)),
    mrr: avg(answerable.map((r) => r.reciprocalRank)),
    falseRefusalRate: avg(answerable.map((r) => (r.answered ? 0 : 1))), // câu có đáp án mà vẫn từ chối
    correctRefusalRate: avg(unanswerable.map((r) => (r.correctRefusal ? 1 : 0))),
  };
}