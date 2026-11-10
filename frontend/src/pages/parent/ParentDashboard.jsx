import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChildren, getNotifications } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';

export default function ParentDashboard() {
  const [children, setChildren] = useState(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getChildren(), getNotifications(true)])
      .then(([c, n]) => { setChildren(c); setUnread(n.length); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!children) return <p>Đang tải...</p>;

  return (
    <>
      <h2>Trang phụ huynh</h2>
      <div className="row">
        <Link className="btn" to="/parent/link">+ Liên kết con</Link>
        <Link className="btn btn-light" to="/parent/alerts">
          Cảnh báo{unread > 0 && <span className="badge">{unread}</span>}
        </Link>
      </div>
      {children.length === 0 ? (
        <p>Chưa liên kết với học sinh nào. Hãy nhập mã do con cung cấp.</p>
      ) : (
        children.map((c) => (
          <div className="card" key={c.id}>
            <strong>{c.fullName}</strong> <small>{c.email}</small>
            <div><Link to={`/parent/children/${c.id}`}>Xem tiến độ học tập →</Link></div>
          </div>
        ))
      )}
    </>
  );
}