import { env } from '../../config/env.js';

export const NO_DOC_MESSAGE = 'Hiện chưa có tài liệu về nội dung này.';

/** true nếu đoạn liên quan nhất đạt hoặc vượt ngưỡng tin cậy. */
export function hasEnoughEvidence(topScore, threshold = env.CONFIDENCE_THRESHOLD) {
  return typeof topScore === 'number' && topScore >= threshold;
}
