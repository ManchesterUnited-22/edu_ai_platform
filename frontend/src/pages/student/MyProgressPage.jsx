import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProgress } from '../../api/progress.js';
import { errorMessage } from '../../api/client.js';
import ScoreChart from '../../components/charts/ScoreChart.jsx';
import WeakTopicChart from '../../components/charts/WeakTopicChart.jsx';
import ClassPicker from '../../components/common/ClassPicker.jsx';

const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1));

export default function MyProgressPage() {
  const [classId, setClassId] = useState(null);
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    setP(null);
    setError('');
    getMyProgress(classId).then(setP).catch((err) => setError(errorMessage(err)));
  }, [classId]);

  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Tiến độ của em</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      {error && <p className="error">{error}</p>}
      {p && (
        <>
          <div className="card">
            <p>
              Bài kiểm tra: <strong>{p.official.count}</strong> lượt, điểm TB tốt nhất <strong>{fmt(p.official.average)}</strong>/10
              <br />
              Luyện tập: <strong>{p.practice.count}</strong> bài, điểm TB <strong>{fmt(p.practice.average)}</strong>/10
            </p>
          </div>
          <div className="card"><h3>Điểm các lần kiểm tra</h3><ScoreChart attempts={p.official.attempts} /></div>
          <div className="card">
            <h3>Tỷ lệ đúng theo chủ đề</h3>
            <small>Đỏ: chủ đề cần ôn (đúng dưới 60%, từ 3 câu trở lên).</small>
            <WeakTopicChart topics={p.topics} />
            {p.weakTopics.length > 0 && <Link to="/student/review">Xem gợi ý ôn tập →</Link>}
          </div>
        </>
      )}
    </>
  );
}