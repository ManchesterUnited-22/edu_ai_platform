import { useState } from 'react';
import { createLinkCode } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';

function LinkCodeCard() {
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    setError('');
    try {
      setCode(await createLinkCode());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="card">
      <h3>Liên kết với phụ huynh</h3>
      <p>Tạo mã rồi đưa cho phụ huynh nhập. Mã dùng một lần, hết hạn sau ít phút.</p>
      <button className="btn" onClick={generate}>Tạo mã mới</button>
      {code && (
        <p>
          Mã của em: <strong className="code">{code.code}</strong>
          <br />
          <small>Hết hạn lúc {new Date(code.expiresAt).toLocaleTimeString('vi-VN')}</small>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <>
      <h2>Trang học sinh</h2>
      <LinkCodeCard />
    </>
  );
}