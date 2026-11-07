// Máy trạng thái chung cho nội dung giáo viên duyệt: draft -> reviewed -> published -> revoked
import { AppError } from '../../utils/AppError.js';

export const TRANSITIONS = Object.freeze({
  review: { from: ['draft', 'revoked'], to: 'reviewed' },
  publish: { from: ['reviewed'], to: 'published' },
  unpublish: { from: ['published'], to: 'revoked' },
});

const messages = {
  review: (current) => `Không thể duyệt nội dung đang ở trạng thái "${current}"`,
  publish: (current) =>
    current === 'published' ? 'Nội dung đã được xuất bản' : 'Phải duyệt (review) trước khi xuất bản',
  unpublish: () => 'Chỉ có thể thu hồi nội dung đang được xuất bản',
};

/** Trả về luật chuyển trạng thái, hoặc ném 409 nếu không được phép từ trạng thái hiện tại. */
export function resolveTransition(action, currentStatus) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new AppError('Hành động không hợp lệ', 400, 'INVALID_ACTION');
  if (!rule.from.includes(currentStatus)) {
    throw new AppError(messages[action](currentStatus), 409, 'INVALID_TRANSITION');
  }
  return rule;
}