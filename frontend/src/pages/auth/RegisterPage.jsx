import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth.js';
import { errorMessage } from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { homeFor } from './LoginPage.jsx';

const ROLES = [
  { value: 'student', label: 'Học sinh', hint: 'Học và làm bài' },
  { value: 'parent', label: 'Phụ huynh', hint: 'Theo dõi con' },
  { value: 'teacher', label: 'Giáo viên', hint: 'Quản lý lớp' },
];

export default function RegisterPage() {
  const { user, setSession } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '', role: 'student', inviteCode: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Mật khẩu cần ít nhất 8 ký tự');
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại chưa khớp');

    setBusy(true);
    try {
      const data = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(form.role === 'teacher' && form.inviteCode.trim() ? { inviteCode: form.inviteCode.trim() } : {}),
      });
      setSession(data); // đăng ký xong tự đăng nhập
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
        <h1>Tạo tài khoản để bắt đầu</h1>
        <ul>
          <li>Học sinh: hỏi đáp theo tài liệu của lớp, làm bài và xem tiến độ.</li>
          <li>Phụ huynh: nhập mã do con cung cấp để theo dõi kết quả học tập.</li>
          <li>Giáo viên: đăng tài liệu, sinh câu hỏi bằng AI, ra bài kiểm tra.</li>
        </ul>
      </section>

      <form className="login-form" onSubmit={submit}>
        <h2>Đăng ký</h2>
<p className="auth-sub">Tạo tài khoản chỉ mất một phút</p>
        <fieldset className="role-picker">
          <legend>Bạn là</legend>
          {ROLES.map((r) => (
            <label key={r.value} className="role-option">
              <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} />
              <strong>{r.label}</strong>
              <small>{r.hint}</small>
            </label>
          ))}
        </fieldset>

        <label className="field">
          Họ và tên
          <input value={form.fullName} onChange={set('fullName')} minLength={2} maxLength={100} required autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="username" />
        </label>
        <label className="field">
          Mật khẩu (ít nhất 8 ký tự)
          <input type="password" value={form.password} onChange={set('password')} minLength={8} required autoComplete="new-password" />
        </label>
        <label className="field">
          Nhập lại mật khẩu
          <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </label>
        {form.role === 'teacher' && (
          <label className="field">
            Mã giáo viên (nếu nhà trường có cấp)
            <input value={form.inviteCode} onChange={set('inviteCode')} maxLength={100} />
          </label>
        )}

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
        <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
      </form>
    </div>
  );
}