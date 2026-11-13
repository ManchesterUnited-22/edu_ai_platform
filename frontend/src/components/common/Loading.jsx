// Trạng thái tải
export default function Loading({ text = 'Đang tải...' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="loading-copy">{text}</span>
      <span className="loading-skeleton" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}