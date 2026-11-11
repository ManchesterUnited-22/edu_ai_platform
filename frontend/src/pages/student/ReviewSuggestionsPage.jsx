import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../../api/recommendations.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';
import formatMath from '../../utils/formatMath.js';
export default function ReviewSuggestionsPage() {
  const [classId, setClassId] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    setData(null);
    setError('');
    getRecommendations(classId).then(setData).catch((err) => setError(errorMessage(err)));
  }, [classId]);

  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Gợi ý ôn tập</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      {error && <p className="error">{error}</p>}
      {classId && !data && !error && <p>Đang tải...</p>}

      {data && data.recommendations.length === 0 && (
        <div className="card">Em chưa có chủ đề yếu nào. Cứ tiếp tục phát huy nhé!</div>
      )}

      {data?.recommendations.map((r) => (
        <div className="card" key={r.topic}>
          <h3>{r.topic} <small>đúng {Math.round(r.accuracy * 100)}%</small></h3>

          {r.reviewFirst.length > 0 && (
            <p>
              <strong>Nên ôn trước:</strong>{' '}
              {r.reviewFirst.map((p) => p.topic).join(' → ')} → <strong>{r.topic}</strong>
            </p>
          )}

          {r.materials.length === 0 ? (
            <p>Chưa có tài liệu liên quan được xuất bản.</p>
          ) : (
            r.materials.map((m) => (
              <blockquote key={m.chunkId}>
                <small>
                  {m.topic} · {m.fileName}
                  {m.pageNumber ? ` · trang ${m.pageNumber}` : ''}
                </small>
                <p>{formatMath(m.excerpt)}</p>
              </blockquote>
            ))
          )}
        </div>
      ))}
      {data && <small>{data.graphUsed ? 'Gợi ý từ đồ thị chủ đề.' : 'Gợi ý từ dữ liệu lớp (đồ thị không bật).'}</small>}
    </>
  );
}