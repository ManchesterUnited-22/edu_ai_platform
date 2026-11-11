import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

// [đường dẫn, tên hiển thị, chỉ khớp đúng đường dẫn]
const NAV = {
  student: [
    ['/student', 'Trang học', true],
    ['/student/materials', 'Tài liệu'],
    ['/student/ask', 'Hỏi đáp'],
    ['/student/quizzes', 'Kiểm tra'],
    ['/student/practice', 'Luyện tập'],
    ['/student/progress', 'Tiến độ'],
  ],
  teacher: [
    ['/teacher', 'Tổng quan', true],
    ['/teacher/classes', 'Lớp học'],
    ['/teacher/topics', 'Chủ đề'],
  ],
  parent: [
    ['/parent', 'Con của tôi', true],
    ['/parent/alerts', 'Cảnh báo'],
  ],
};
const ROLE = { student: 'Học sinh', teacher: 'Giáo viên', parent: 'Phụ huynh' };

// Chữ cái đầu của tên (từ cuối cùng trong họ tên Việt)
const initial = (name = '') => name.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? '?';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-logo" aria-hidden="true">🎓</span>
        <span className="brand-text">Học tập AI</span>
      </Link>
      {user && (
        <>
          <nav className="nav" aria-label="Menu chính">
            {(NAV[user.role] ?? []).map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-right">
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">{initial(user.fullName)}</span>
              <span className="user-meta">
                <strong>{user.fullName}</strong>
                <small>{ROLE[user.role]}</small>
              </span>
            </div>
            <button className="btn btn-light btn-sm" onClick={() => { logout(); navigate('/login'); }}>
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </header>
  );
}