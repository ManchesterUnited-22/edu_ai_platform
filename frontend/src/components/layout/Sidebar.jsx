import { useEffect, useState } from 'react';
import { NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { listClasses } from '../../api/classes.js';
import { listAnswerReports } from '../../api/reports.js';
import Icon from '../common/Icon.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { useClassStore } from '../../store/classStore.js';

// [đường dẫn, tên, biểu tượng, chỉ khớp đúng đường dẫn]
const NAV = {
  student: [
    { items: [['/student', 'Trang học', 'home', true]] },
    { title: 'Học', items: [['/student/materials', 'Tài liệu', 'book'], ['/student/ask', 'Hỏi đáp', 'chat'], ['/student/socratic', 'Giải từng bước', 'steps']] },
    { title: 'Kiểm tra', items: [['/student/quizzes', 'Bài kiểm tra', 'clipboard'], ['/student/practice', 'Luyện tập', 'pencil']] },
    { title: 'Theo dõi', items: [['/student/progress', 'Tiến độ', 'chart'], ['/student/review', 'Gợi ý ôn tập', 'bulb']] },
  ],
  teacher: [
    { items: [['/teacher', 'Tổng quan', 'home', true], ['/teacher/verification', 'Xác minh hồ sơ', 'shield'], ['/teacher/classes', 'Danh sách lớp', 'class', true], ['/teacher/topics', 'Chủ đề', 'topics']] },
  ],
  admin: [
    { items: [['/admin', 'Quản trị hệ thống', 'shield', true]] },
  ],
  parent: [
    { items: [['/parent', 'Con của tôi', 'users', true], ['/parent/link', 'Liên kết con', 'link'], ['/parent/alerts', 'Cảnh báo', 'bell']] },
  ],
};
// [đường dẫn con, tên, biểu tượng, chỉ khớp đúng, có badge]
const CLASS_NAV = [
  ['', 'Học sinh của lớp', 'users', true],
  ['/documents', 'Tài liệu', 'book'],
  ['/outlines', 'Dàn ý bài giảng', 'steps'],
  ['/questions', 'Ngân hàng câu hỏi', 'pencil'],
  ['/quizzes', 'Bài kiểm tra', 'clipboard'],
  ['/report', 'Báo cáo lớp', 'chart', true],
  ['/reports', 'Báo cáo trả lời sai', 'bell', true, true],
];

function TeacherClassNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const urlId = useMatch('/teacher/classes/:classId/*')?.params.classId;
  const { classId, setClassId } = useClassStore();
  const [classes, setClasses] = useState([]);
  const [openReports, setOpenReports] = useState(0);

  // Tải lại khi đổi trang để thấy lớp mới tạo
  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
  }, [pathname]);

  const has = (id) => classes.some((c) => c.id === id);
  const current = has(urlId) ? urlId : has(classId) ? classId : classes[0]?.id ?? '';

  useEffect(() => {
    if (current && current !== classId) setClassId(current);
  }, [current, classId, setClassId]);

  // Số báo cáo trả lời sai chưa xử lý
  useEffect(() => {
    if (!current) { setOpenReports(0); return; }
    listAnswerReports(current, 'open').then((r) => setOpenReports(r.length)).catch(() => {});
  }, [current, pathname]);

  const onChange = (e) => {
    const next = e.target.value;
    setClassId(next);
    // Đang ở trang con của một lớp thì chuyển sang đúng trang đó của lớp mới
    if (urlId) navigate(pathname.replace(urlId, next));
  };

  if (classes.length === 0) {
    return <p className="side-empty">Chưa có lớp. Tạo lớp ở mục “Danh sách lớp”.</p>;
  }

  return (
    <div className="side-group side-class-group">
      <div className="side-title">Lớp đang chọn</div>
      <div className="side-class">
        <select value={current} onChange={onChange} aria-label="Chọn lớp">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="side-subnav">
        {CLASS_NAV.map(([sub, label, icon, end, badge]) => (
          <NavLink key={sub} to={`/teacher/classes/${current}${sub}`} end={end} className="side-link">
            <Icon name={icon} />
            {label}
            {badge && openReports > 0 && <span className="badge side-badge">{openReports}</span>}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <aside className="sidebar">
      <nav aria-label="Menu chính">
        {(NAV[user.role] ?? []).map((group, i) => (
          <div className="side-group" key={i}>
            {group.title && <div className="side-title">{group.title}</div>}
            {group.items.map(([to, label, icon, end]) => (
              <NavLink key={to} to={to} end={end} className="side-link">
                <Icon name={icon} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
         {user.role === 'teacher' && <TeacherClassNav />}
      </nav>
    </aside>
  );
}