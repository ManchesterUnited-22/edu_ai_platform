import { useState } from 'react';
import { Link } from 'react-router-dom';
import { linkChild } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';

export default function LinkChildPage() {
  const [code, setCode] = useState('');
  const [child, setChild] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setChild(await linkChild(code));
      setCode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Liên kết với con</h2>
      <input
        placeholder="Nhập mã 8 ký tự"
        value={code}
        maxLength={12}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        required
      />
      {error && <p className="error">{error}</p>}
      {child && (
        <p className="ok">
          Đã liên kết với <strong>{child.fullName}</strong>. <Link to={`/parent/children/${child.id}`}>Xem tiến độ</Link>
        </p>
      )}
      <button className="btn" disabled={busy}>{busy ? 'Đang xử lý...' : 'Liên kết'}</button>
      <Link to="/parent">← Quay lại</Link>
    </form>
  );
}