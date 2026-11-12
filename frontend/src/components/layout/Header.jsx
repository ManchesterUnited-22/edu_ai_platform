import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

const ROLE = { student: 'Học sinh', teacher: 'Giáo viên', parent: 'Phụ huynh' };

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6" /></svg>
        </span>
        Học tập AI
      </Link>
      {user && (
        <div className="header-right">
          <span className="who">{user.fullName} <small>({ROLE[user.role]})</small></span>
          <button className="btn btn-light" onClick={() => { logout(); navigate('/login'); }}>
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  );
}