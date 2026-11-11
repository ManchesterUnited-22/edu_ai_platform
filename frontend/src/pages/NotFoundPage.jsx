import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="card notfound">
      <div className="big">404</div>
      <h2>Không tìm thấy trang</h2>
      <p>Trang bạn tìm có thể đã bị xóa hoặc đường dẫn chưa đúng.</p>
      <Link className="btn" to="/">Về trang chủ</Link>
    </div>
  );
}