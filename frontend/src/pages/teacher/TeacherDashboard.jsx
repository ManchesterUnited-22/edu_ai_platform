import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  return (
    <>
      <h2>Trang giáo viên</h2>
      <div className="card">
        <Link to="/teacher/classes">Lớp học của tôi →</Link><br />
        <Link to="/teacher/topics">Quản lý chủ đề và quan hệ tiên quyết →</Link>
      </div>
    </>
  );
}