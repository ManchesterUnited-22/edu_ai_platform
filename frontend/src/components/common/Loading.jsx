// Trạng thái tải
export default function Loading({ text = 'Đang tải...' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {text}
    </div>
  );
}