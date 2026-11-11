import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClassReport } from '../../api/reports.js';
import { errorMessage } from '../../api/client.js';
import WeakTopicChart from '../../components/charts/WeakTopicChart.jsx';
import formatMath from '../../utils/formatMath.js';

const f1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const pct = (n) => `${Math.round(Number(n) * 100)}%`;

export default function ClassReportPage() {
  const { classId } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getClassReport(classId).then(setR).catch((e) => setError(errorMessage(e)));
  }, [classId]);

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Báo cáo lớp</h2>
      {error && <p className="error">{error}</p>}
      {!r && !error && <p>Đang tải...</p>}
      {r && (
        <>
          <div className="card">
            <p>
              <strong>{r.summary.studentCount}</strong> học sinh · <strong>{r.summary.quizCount}</strong> bài kiểm tra ·{' '}
              <strong>{r.summary.practiceCount}</strong> bài luyện tập
              <br />
              Điểm TB lớp <strong>{f1(r.summary.average)}</strong> · cao nhất <strong>{f1(r.summary.highest)}</strong> · thấp nhất <strong>{f1(r.summary.lowest)}</strong>
            </p>
          </div>

          <div className="card">
            <h3>Học sinh</h3>
            <table>
              <thead><tr><th>Họ tên</th><th>Bài KT</th><th>Điểm TB</th><th>Luyện tập</th></tr></thead>
              <tbody>
                {r.students.map((s) => (
                  <tr key={s.studentId}><td>{s.fullName}</td><td>{s.quizzesTaken}</td><td>{f1(s.officialAverage)}</td><td>{s.practiceCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Từng bài kiểm tra</h3>
            <table>
              <thead><tr><th>Bài</th><th>Số HS</th><th>Hoàn thành</th><th>Điểm TB</th></tr></thead>
              <tbody>
                {r.quizzes.map((q) => (
                  <tr key={q.quizId}><td>{q.title}</td><td>{q.students}</td><td>{pct(q.completionRate)}</td><td>{f1(q.average)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Tỷ lệ đúng theo chủ đề</h3>
            <small>Đỏ: chủ đề cả lớp đang yếu.</small>
            <WeakTopicChart topics={r.topics} />
          </div>

          <div className="card">
            <h3>Câu hỏi khó nhất</h3>
            {r.hardQuestions.length === 0 && <p>Chưa đủ dữ liệu (cần từ 3 lượt trả lời mỗi câu).</p>}
            {r.hardQuestions.map((q) => (
              <p key={q.questionId}>{formatMath(q.text)} <small>· đúng {pct(q.accuracy)} ({q.correct}/{q.total})</small></p>
            ))}
          </div>

          <div className="card">
            <h3>Hỏi đáp</h3>
            <p>
              {r.qa.total} câu hỏi · bị từ chối {r.qa.refused} ({pct(r.qa.refusalRate)}) ·{' '}
              <Link to={`/teacher/classes/${classId}/reports`}>{r.qa.openReports} báo cáo đang mở</Link>
            </p>
            {r.qa.recentRefusedQuestions?.length > 0 && (
              <>
                <strong>Câu học sinh hỏi mà chưa có tài liệu (nên bổ sung):</strong>
                <ul>{r.qa.recentRefusedQuestions.map((q, i) => <li key={i}>{typeof q === 'string' ? q : q.question}</li>)}</ul>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}