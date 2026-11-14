import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { register } from '../../api/auth.js';
import { errorMessage } from '../../api/client.js';
import Icon from '../../components/common/Icon.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { homeFor } from './LoginPage.jsx';

const ROLES = {
  student: { label: 'Học sinh', icon: 'book', tone: 'blue', desc: 'Hỏi đáp theo tài liệu của lớp, luyện tập, làm bài và xem tiến độ.' },
  parent: { label: 'Phụ huynh', icon: 'users', tone: 'sage', desc: 'Nhập mã do con cung cấp để theo dõi kết quả và nhận cảnh báo.' },
  teacher: { label: 'Giáo viên', icon: 'class', tone: 'ochre', desc: 'Đăng tài liệu, sinh câu hỏi bằng AI, ra bài kiểm tra.' },
};

function Shell({ step, children }) {
  return (
    <div className="rg">
      <header className="rg-top">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6" /></svg>
          </span>
          <span className="brand-name">Học tập AI</span>
        </Link>
        <span>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></span>
      </header>
      <ol className="rg-steps" aria-label="Các bước đăng ký">
        <li className="on" aria-current={step === 1 ? 'step' : undefined}><i>1</i>Chọn vai trò</li>
        <li className={step >= 2 ? 'on' : ''} aria-current={step === 2 ? 'step' : undefined}><i>2</i>Thông tin tài khoản</li>
      </ol>
      {children}
    </div>
  );
}

// Bước 1: chọn vai trò
function ChooseRole() {
  return (
    <Shell step={1}>
      <main className="rg-main">
        <h1>Bạn tham gia với vai trò nào?</h1>
        <p className="rg-sub">Mỗi tài khoản gắn với một vai trò, giao diện sẽ được chuẩn bị riêng cho bạn.</p>
        <div className="rg-roles">
          {Object.entries(ROLES).map(([key, r]) => (
            <Link key={key} to={`/register/${key}`} className="rg-role">
              <span className={`icon-badge ${r.tone}`}><Icon name={r.icon} /></span>
              <strong>{r.label}</strong>
              <p>{r.desc}</p>
              <span className="rg-role-go">Tiếp tục <Icon name="arrow" /></span>
            </Link>
          ))}
        </div>
        <p className="rg-back"><Link to="/">← Về trang chủ</Link></p>
      </main>
    </Shell>
  );
}

// Bước 2: nhập thông tin
function RegisterForm({ role }) {
  const meta = ROLES[role];
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '', inviteCode: '', teacherType: 'independent',
    teacherSubjects: '', teacherExperienceYears: '', teacherBio: '',
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

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
        role,
        ...(role === 'teacher' ? { teacherType: form.teacherType } : {}),
        ...(role === 'teacher' ? {
          teacherSubjects: form.teacherSubjects.trim(),
          teacherExperienceYears: form.teacherExperienceYears === '' ? undefined : Number(form.teacherExperienceYears),
          teacherBio: form.teacherBio.trim(),
        } : {}),
        ...(role === 'teacher' && form.inviteCode.trim() ? { inviteCode: form.inviteCode.trim() } : {}),
      });
      if (data.pendingApproval) {
        setPendingApproval(true);
      } else if (data.mfaSetupRequired) {
        navigate('/login', { replace: true });
      } else {
        setSession(data); // đăng ký xong tự đăng nhập
        // Phụ huynh cần liên kết với con ngay sau khi đăng ký
        navigate(data.user.role === 'parent' ? '/parent/link' : homeFor(data.user.role), { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (pendingApproval) {
    return (
      <Shell step={2}>
        <section className="rg-card approval-success">
          <span className="form-kicker">ĐÃ TIẾP NHẬN HỒ SƠ</span>
          <div className="approval-icon">✓</div>
          <h1>Chờ admin duyệt</h1>
          <p className="auth-sub">Tài khoản giáo viên đã được tạo. Bạn sẽ đăng nhập và sử dụng chức năng giáo viên sau khi admin phê duyệt.</p>
          <Link className="btn login-submit" to="/login">Về trang đăng nhập</Link>
        </section>
      </Shell>
    );
  }

  return (
    <Shell step={2}>
      <form className="rg-card" onSubmit={submit}>
        <div className="rg-chip">
          <span className={`icon-badge ${meta.tone}`}><Icon name={meta.icon} /></span>
          <span><small>Đăng ký với vai trò</small><strong>{meta.label}</strong></span>
          <Link to="/register">Đổi</Link>
        </div>
        <h1>Tạo tài khoản</h1>

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
          <div className="rg-pass">
            <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} minLength={8} required autoComplete="new-password" />
            <button type="button" onClick={() => setShow((v) => !v)}>{show ? 'Ẩn' : 'Hiện'}</button>
          </div>
        </label>
        <label className="field">
          Nhập lại mật khẩu
          <input type={show ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </label>
        {role === 'teacher' && (
          <>
            <label className="field">
              Bạn đang giảng dạy theo hình thức nào?
              <select value={form.teacherType} onChange={set('teacherType')}>
                <option value="institution">Trường học / trung tâm</option>
                <option value="independent">Gia sư / giáo viên tự do</option>
                <option value="online">Giáo viên online / người xây dựng khóa học</option>
              </select>
            </label>
            <label className="field">
              Mã mời tổ chức (nếu có)
              <input value={form.inviteCode} onChange={set('inviteCode')} maxLength={100} placeholder="Không bắt buộc" />
              <small>Không có mã vẫn có thể bắt đầu ở mức Basic và xây dựng uy tín dần.</small>
            </label>
            <label className="field">
              Môn hoặc lĩnh vực giảng dạy
              <input value={form.teacherSubjects} onChange={set('teacherSubjects')} maxLength={300} placeholder="Ví dụ: Toán THPT, IELTS" />
            </label>
            <label className="field">
              Số năm kinh nghiệm
              <input type="number" value={form.teacherExperienceYears} onChange={set('teacherExperienceYears')} min="0" max="80" />
            </label>
            <label className="field">
              Giới thiệu ngắn về hoạt động giảng dạy
              <textarea value={form.teacherBio} onChange={set('teacherBio')} maxLength={1000} rows="4" placeholder="Mô tả cách bạn dạy, đối tượng học viên và kinh nghiệm nổi bật." />
            </label>
          </>
        )}
        {role === 'parent' && <p className="rg-hint">Sau khi đăng ký, bạn sẽ nhập mã liên kết do con cung cấp để theo dõi việc học.</p>}

        {error && <p className="error">{error}</p>}
        <button className="btn login-submit" disabled={busy}>{busy ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
        <p className="rg-back"><Link to="/register">← Chọn lại vai trò</Link></p>
      </form>
    </Shell>
  );
}

export default function RegisterPage() {
  const { role } = useParams();
  const user = useAuthStore((s) => s.user);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  if (!role) return <ChooseRole />;
  if (!ROLES[role]) return <Navigate to="/register" replace />;
  return <RegisterForm role={role} />;
}