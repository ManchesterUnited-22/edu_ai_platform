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

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="header">
      <Link to="/" className="brand">Học tập AI</Link>
      {user && (
        <>
          <nav className="nav" aria-label="Menu chính">
            {(NAV[user.role] ?? []).map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-right">
            <span>{user.fullName} <small>({ROLE[user.role]})</small></span>
            <button className="btn btn-light" onClick={() => { logout(); navigate('/login'); }}>
              Đăng xuất
            </button>
          </div>
        </>
      )}
    </header>
  );
}