import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../../api/auth.js';
import { errorMessage } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';

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
    <form className="card auth-card" onSubmit={submit}>
      <h2>Đăng nhập</h2>
      <p>Dùng tài khoản học sinh, giáo viên hoặc phụ huynh của bạn.</p>
      <label className="field">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </label>
      <label className="field">
        Mật khẩu
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    </form>
  );
}