import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { confirmMfaSetup, login, setupMfa, verifyMfa } from '../../api/auth.js';
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
  const [challenge, setChallenge] = useState(null);
  const [setup, setSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingSession, setPendingSession] = useState(null);

  useEffect(() => {
    if (!challenge?.mfaSetupRequired) return;
    setSetup(null);
    setupMfa(challenge.mfaToken)
      .then(setSetup)
      .catch((err) => setError(errorMessage(err)));
  }, [challenge]);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (challenge) {
        const data = challenge.mfaSetupRequired
          ? await confirmMfaSetup(challenge.mfaToken, mfaCode)
          : await verifyMfa(challenge.mfaToken, mfaCode);
        if (challenge.mfaSetupRequired) {
          setPendingSession(data);
          setChallenge(null);
          setSetup(null);
        } else {
          setSession(data);
          navigate(homeFor(data.user.role), { replace: true });
        }
        return;
      }
      const data = await login(email, password);
      if (data.mfaRequired || data.mfaSetupRequired) {
        setChallenge(data);
      } else {
        setSession(data);
        navigate(homeFor(data.user.role), { replace: true });
      }
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
        {pendingSession ? (
          <>
            <p className="auth-sub">MFA đã được bật thành công. Hãy lưu các mã khôi phục trước khi tiếp tục.</p>
            <div className="mfa-recovery-codes">
              {pendingSession.recoveryCodes.map((code) => <code key={code}>{code}</code>)}
            </div>
            <button type="button" className="btn login-submit" onClick={() => {
              setSession(pendingSession);
              navigate(homeFor(pendingSession.user.role), { replace: true });
            }}>Tôi đã lưu mã, tiếp tục</button>
          </>
        ) : challenge ? (
          <>
            <p className="auth-sub">
              {challenge.mfaSetupRequired
                ? 'Thiết lập ứng dụng Authenticator để bảo vệ tài khoản giáo viên.'
                : 'Nhập mã 6 số từ ứng dụng Authenticator hoặc một mã khôi phục.'}
            </p>
            {challenge.mfaSetupRequired && setup && (
              <div className="mfa-setup">
                <img src={setup.qrCodeDataUrl} alt="Mã QR thiết lập Authenticator" className="mfa-qr" />
                <p>Không quét được mã? Nhập khóa này thủ công:</p>
                <code className="mfa-secret">{setup.secret}</code>
              </div>
            )}
            {challenge.mfaSetupRequired && !setup && <p className="muted">Đang tạo thông tin thiết lập...</p>}
            <label className="field">
              {challenge.mfaSetupRequired ? 'Mã xác nhận thiết lập' : 'Mã MFA'}
              <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={20} required autoFocus />
            </label>
            <button type="button" className="btn btn-light" onClick={() => { setChallenge(null); setSetup(null); setMfaCode(''); }}>Quay lại đăng nhập</button>
          </>
        ) : (
          <>
            <p className="auth-sub">Chào mừng bạn quay lại 👋</p>
            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </label>
            <label className="field">
              Mật khẩu
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </label>
          </>
        )}
        {error && <p className="error">{error}</p>}
        {!pendingSession && <button className="btn login-submit" disabled={busy || (challenge?.mfaSetupRequired && !setup)}>{busy ? 'Đang xác thực...' : challenge ? 'Xác nhận MFA' : 'Đăng nhập'}</button>}
        {!challenge && !pendingSession && <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>}
      </form>
    </div>
  );
}