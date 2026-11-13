import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth.js';
import { errorMessage } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { Link } from 'react-router-dom';
export const homeFor = (role) =>
  ({ parent: '/parent', student: '/student', teacher: '/teacher' })[role] ?? '/login';

export default function LoginPage() {
  const { user, setSession } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await login(email, password);
      setSession(data);
      navigate(homeFor(data.user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-brand">
        <span className="login-kicker">HỌC TẬP CÓ ĐỊNH HƯỚNG</span>
        <h1>Học từ chính tài liệu của lớp mình</h1>
        <p className="login-lead">Một không gian học tập thông minh, nơi mỗi câu hỏi đều dẫn đến một bước tiến rõ ràng.</p>
        <ul>
          <li>Hỏi đáp có trích dẫn nguồn. Không có trong tài liệu thì nói thẳng là chưa có.</li>
          <li>Gia sư gợi ý từng bước để em tự tìm ra đáp án.</li>
          <li>Phụ huynh theo dõi tiến độ và nhận cảnh báo sớm.</li>
        </ul>
        <div className="login-proof" aria-label="Điểm nổi bật">
          <span><strong>01</strong><small>Học theo tài liệu thật</small></span>
          <span><strong>02</strong><small>AI gợi ý có trách nhiệm</small></span>
          <span><strong>03</strong><small>Tiến bộ có thể theo dõi</small></span>
        </div>
        <div className="login-art" aria-hidden="true">
          <div className="login-orbit orbit-one" />
          <div className="login-orbit orbit-two" />
          <div className="login-art-card">
            <span className="art-card-icon">✦</span>
            <span><strong>Gợi ý học tập</strong><small>Đang sẵn sàng cho bạn</small></span>
            <b>+24%</b>
          </div>
          <div className="login-art-dot dot-one" />
          <div className="login-art-dot dot-two" />
        </div>
      </section>
      <form className="login-form" onSubmit={submit}>
        <div className="login-form-head">
          <span className="form-kicker">CHÀO MỪNG TRỞ LẠI</span>
          <h2>Đăng nhập</h2>
        </div>
        <p className="auth-sub">Chào mừng bạn quay lại 👋</p>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="field">
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn login-submit" disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}