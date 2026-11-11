import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChildren, getNotifications } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';
import Loading from '../../components/common/Loading.jsx';

const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '?';

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
  if (!children) return <Loading />;

  return (
    <>
      <section className="hero">
        <h2>Trang phụ huynh <span className="wave">👨‍👩‍👧</span></h2>
        <p>Theo dõi việc học của con và nhận cảnh báo khi cần quan tâm thêm.</p>
      </section>

      <div className="row" style={{ margin: '16px 0' }}>
        <Link className="btn" to="/parent/link">+ Liên kết con</Link>
        <Link className="btn btn-light" to="/parent/alerts">
          Cảnh báo{unread > 0 && <span className="badge">{unread}</span>}
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="card">Chưa liên kết với học sinh nào. Hãy nhập mã do con cung cấp.</div>
      ) : (
        children.map((c) => (
          <div className="card child-card" key={c.id}>
            <span className="avatar" aria-hidden="true">{initial(c.fullName)}</span>
            <div className="grow">
              <strong>{c.fullName}</strong><br />
              <small>{c.email}</small>
            </div>
            <Link className="btn btn-light btn-sm" to={`/parent/children/${c.id}`}>Xem tiến độ →</Link>
          </div>
        ))
      )}
    </>
  );
}