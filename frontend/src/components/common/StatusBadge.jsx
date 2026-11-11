export const STATUS_LABEL = {
  draft: 'Nháp', reviewed: 'Đã duyệt', published: 'Đang xuất bản', revoked: 'Đã thu hồi',
  uploaded: 'Chờ xử lý', processing: 'Đang xử lý', ready: 'Sẵn sàng', failed: 'Lỗi',
  open: 'Đang mở', resolved: 'Đã xử lý', dismissed: 'Bỏ qua',
};

/** Hành động tiếp theo hợp lệ cho từng trạng thái xuất bản. */
export const NEXT_ACTIONS = {
  draft: [['review', 'Duyệt']],
  revoked: [['review', 'Duyệt']],
  reviewed: [['publish', 'Xuất bản']],
  published: [['unpublish', 'Thu hồi']],
};

export default function StatusBadge({ status }) {
  return <span className={`tag status-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}