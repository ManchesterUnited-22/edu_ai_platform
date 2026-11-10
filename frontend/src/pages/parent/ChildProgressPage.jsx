import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getChildProgress } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';

const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1));

function ClassProgress({ cls, progress }) {
  return (
    <div className="card">
      <h3>{cls.name} <small>{cls.subject}</small></h3>
      <p>
        Bài kiểm tra: <strong>{progress.official.count}</strong> lượt, điểm TB tốt nhất{' '}
        <strong>{fmt(progress.official.average)}</strong> / 10
        <br />
        Luyện tập: <strong>{progress.practice.count}</strong> bài, điểm TB{' '}
        <strong>{fmt(progress.practice.average)}</strong> / 10
      </p>

      <h4>Chủ đề cần ôn</h4>
      {progress.weakTopics.length === 0 ? (
        <p>Chưa có chủ đề yếu.</p>
      ) : (
        <ul>
          {progress.weakTopics.map((t) => (
            <li key={t.topic}>
              {t.topic}: đúng {t.correct}/{t.total} ({Math.round(t.accuracy * 100)}%)
            </li>
          ))}
        </ul>
      )}

      <h4>Các lần làm bài kiểm tra</h4>
      {progress.official.attempts.length === 0 ? (
        <p>Chưa có.</p>
      ) : (
        <table>
          <thead><tr><th>Bài</th><th>Lần</th><th>Điểm</th><th>Nộp lúc</th></tr></thead>
          <tbody>
            {progress.official.attempts.map((a) => (
              <tr key={a.attemptId}>
                <td>{a.quizTitle}</td>
                <td>{a.attemptNo}</td>
                <td>{fmt(a.score)}</td>
                <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ChildProgressPage() {
  const { studentId } = useParams();
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getChildProgress(studentId).then(setClasses).catch((err) => setError(errorMessage(err)));
  }, [studentId]);

  return (
    <>
      <Link to="/parent">← Quay lại</Link>
      <h2>Tiến độ học tập của con</h2>
      {error && <p className="error">{error}</p>}
      {!classes && !error && <p>Đang tải...</p>}
      {classes?.length === 0 && <p>Con chưa tham gia lớp nào.</p>}
      {classes?.map(({ class: cls, progress }) => (
        <ClassProgress key={cls.id} cls={cls} progress={progress} />
      ))}
    </>
  );
}