import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { enrollStudent, getClass, removeStudent } from '../../api/classes.js';
import { getClassReport } from '../../api/reports.js';
import { errorMessage } from '../../api/client.js';

export default function ClassDetailPage() {
  const { classId } = useParams();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, report] = await Promise.all([getClass(classId), getClassReport(classId)]);
      setCls(c);
      setStudents(report.students);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const enroll = (e) => {
    e.preventDefault();
    run(async () => { await enrollStudent(classId, email.trim()); setEmail(''); });
  };

  return (
    <>
      <Link to="/teacher/classes">← Các lớp</Link>
      <h2>{cls ? `${cls.name} (${cls.subject})` : 'Lớp học'}</h2>
      <div className="card">
        <Link to={`/teacher/classes/${classId}/documents`}>Tài liệu: tải lên, duyệt, xuất bản →</Link><br />
        <Link to={`/teacher/classes/${classId}/outlines`}>Đề cương và outline bài giảng (AI) →</Link><br />
        <Link to={`/teacher/classes/${classId}/questions`}>Câu hỏi (AI) →</Link><br />
        <Link to={`/teacher/classes/${classId}/quizzes`}>Bài kiểm tra →</Link><br />
        <Link to={`/teacher/classes/${classId}/report`}>Báo cáo lớp →</Link><br />
        <Link to={`/teacher/classes/${classId}/reports`}>Báo cáo câu trả lời sai →</Link>
      </div>

      <form className="card" onSubmit={enroll}>
        <h3>Thêm học sinh vào lớp</h3>
        <div className="row">
          <input style={{ flex: 1 }} type="email" placeholder="Email học sinh" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn">Thêm</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h3>Học sinh ({students.length})</h3>
        {students.length === 0 && <p>Chưa có học sinh.</p>}
        {students.map((s) => (
          <div className="row" key={s.studentId} style={{ justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{s.fullName} <small>· {s.quizzesTaken} bài kiểm tra · TB {s.officialAverage == null ? '—' : Number(s.officialAverage).toFixed(1)}</small></span>
            <button
              className="btn btn-light"
              onClick={() => window.confirm(`Xóa ${s.fullName} khỏi lớp?`) && run(() => removeStudent(classId, s.studentId))}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
    </>
  );
}