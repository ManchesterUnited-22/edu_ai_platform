import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { homeFor } from '../../pages/auth/LoginPage.jsx';
const ROLE = { student: 'Học sinh', teacher: 'Giáo viên', parent: 'Phụ huynh' };

// Trang đích của ô tìm kiếm và nút thông báo theo vai trò
const SEARCH_TO = {
  student: '/student/materials',
  teacher: '/teacher/classes',
  parent: '/parent',
};
const BELL_TO = { parent: '/parent/alerts' };

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu tài khoản khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onSearch = (e) => {
    e.preventDefault();
    const keyword = q.trim();
    if (!keyword || !user) return;
    navigate(`${SEARCH_TO[user.role] ?? '/'}?q=${encodeURIComponent(keyword)}`);
  };

  const onLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <Link to={user ? homeFor(user.role) : '/'} className="brand">
        <span className="brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6" /></svg>
        </span>
        <span className="brand-name">Học tập AI</span>
      </Link>

      {user && (
        <>
          <form className="header-search" role="search" onSubmit={onSearch}>
            <Icon name="search" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm tài liệu, lớp học, chủ đề..."
              aria-label="Tìm kiếm"
            />
          </form>

          <div className="header-right">
            <button
              type="button"
              className="icon-btn"
              aria-label="Thông báo"
              title="Thông báo"
              onClick={() => BELL_TO[user.role] && navigate(BELL_TO[user.role])}
            >
              <Icon name="bell" />
            </button>

            <div className="account" ref={menuRef}>
              <button
                type="button"
                className="account-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="hd-avatar" aria-hidden="true">{initials(user.fullName)}</span>
                <span className="who">
                  <strong>{user.fullName}</strong>
                  <small>{ROLE[user.role]}</small>
                </span>
                <Icon name="chevron" />
              </button>

              {open && (
                <div className="account-menu" role="menu">
                  <div className="account-info">
                    <strong>{user.fullName}</strong>
                    <small>{ROLE[user.role]}</small>
                  </div>
                  <button type="button" role="menuitem" className="account-item" onClick={onLogout}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}