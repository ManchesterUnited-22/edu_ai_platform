import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="card">
      <h2>Không tìm thấy trang</h2>
      <Link to="/">Về trang chủ</Link>
    </div>
  );
}