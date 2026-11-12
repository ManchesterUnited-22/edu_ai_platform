import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { useAuthStore } from '../../store/authStore.js';

// [đường dẫn, tên, biểu tượng, chỉ khớp đúng đường dẫn]
const NAV = {
  student: [
    { items: [['/student', 'Trang học', 'home', true]] },
    { title: 'Học', items: [['/student/materials', 'Tài liệu', 'book'], ['/student/ask', 'Hỏi đáp', 'chat'], ['/student/socratic', 'Giải từng bước', 'steps']] },
    { title: 'Kiểm tra', items: [['/student/quizzes', 'Bài kiểm tra', 'clipboard'], ['/student/practice', 'Luyện tập', 'pencil']] },
    { title: 'Theo dõi', items: [['/student/progress', 'Tiến độ', 'chart'], ['/student/review', 'Gợi ý ôn tập', 'bulb']] },
  ],
  teacher: [
    { items: [['/teacher', 'Tổng quan', 'home', true], ['/teacher/classes', 'Lớp học', 'class'], ['/teacher/topics', 'Chủ đề', 'topics']] },
  ],
  parent: [
    { items: [['/parent', 'Con của tôi', 'users', true], ['/parent/link', 'Liên kết con', 'link'], ['/parent/alerts', 'Cảnh báo', 'bell']] },
  ],
};

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <aside className="sidebar">
      <nav aria-label="Menu chính">
        {(NAV[user.role] ?? []).map((group, i) => (
          <div key={i}>
            {group.title && <div className="side-title">{group.title}</div>}
            {group.items.map(([to, label, icon, end]) => (
              <NavLink key={to} to={to} end={end} className="side-link">
                <Icon name={icon} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}