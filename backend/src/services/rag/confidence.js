import { env } from '../../config/env.js';

export const NO_DOC_MESSAGE = 'Hiện chưa có tài liệu về nội dung này.';

/** true nếu đoạn liên quan nhất đạt hoặc vượt ngưỡng tin cậy. */
export function hasEnoughEvidence(topScore, threshold = env.CONFIDENCE_THRESHOLD) {
  return typeof topScore === 'number' && topScore >= threshold;
}

/** Chỉ giữ các đoạn đạt ngưỡng làm căn cứ đưa cho mô hình (đã sắp theo điểm giảm dần). */
export function selectEvidence(hits, threshold = env.CONFIDENCE_THRESHOLD) {
  return hits.filter((hit) => hasEnoughEvidence(hit.score, threshold));
}

/** Mô hình tự từ chối vì thấy tài liệu không đủ để trả lời. */
export function isRefusalAnswer(answer) {
  const normalize = (s) => s.normalize('NFC').toLowerCase().replace(/[.\s]+$/g, '');
  return normalize(answer).includes(normalize(NO_DOC_MESSAGE));
}