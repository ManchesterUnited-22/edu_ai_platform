import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <header className="header">
      <Link to="/" className="brand">Học tập AI</Link>
      {user && (
        <div className="header-right">
          <span>{user.fullName} ({user.role})</span>
          <button className="btn btn-light" onClick={() => { logout(); navigate('/login'); }}>
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  );
}