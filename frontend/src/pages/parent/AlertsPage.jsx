import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markRead } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';

const LABEL = { inactive: 'Lâu không học', low_quiz: 'Điểm thấp', score_drop: 'Điểm giảm' };

export default function AlertsPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getNotifications().then(setItems).catch((err) => setError(errorMessage(err)));
  }, []);

  const read = async (id) => {
    try {
      const updated = await markRead(id);
      setItems((list) => list.map((n) => (n.id === id ? { ...n, readAt: updated.readAt } : n)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <Link to="/parent">← Quay lại</Link>
      <h2>Cảnh báo</h2>
      {error && <p className="error">{error}</p>}
      {!items && !error && <p>Đang tải...</p>}
      {items?.length === 0 && <p>Chưa có cảnh báo nào.</p>}
      {items?.map((n) => (
        <div className={`card ${n.readAt ? 'read' : 'unread'}`} key={n.id}>
          <span className="tag">{LABEL[n.type] ?? n.type}</span>
          <p>{n.message}</p>
          <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
          {!n.readAt && <button className="btn btn-light" onClick={() => read(n.id)}>Đánh dấu đã đọc</button>}
        </div>
      ))}
    </>
  );
}