import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listAnswerReports, updateAnswerReport } from '../../api/reports.js';
import { errorMessage } from '../../api/client.js';
import CitationCard from '../../components/chat/CitationCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import formatMath from '../../utils/formatMath.js';

export default function WrongAnswerReportsPage() {
  const { classId } = useParams();
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(
    () => listAnswerReports(classId, status || undefined).then(setReports).catch((e) => setError(errorMessage(e))),
    [classId, status],
  );
  useEffect(() => { load(); }, [load]);

  const set = async (id, next) => {
    setError('');
    try {
      await updateAnswerReport(id, next);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Báo cáo câu trả lời sai</h2>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="open">Đang mở</option>
        <option value="resolved">Đã xử lý</option>
        <option value="dismissed">Bỏ qua</option>
        <option value="">Tất cả</option>
      </select>
      {error && <p className="error">{error}</p>}
      {reports?.length === 0 && <p>Không có báo cáo nào.</p>}
      {reports?.map((r) => (
        <div className="card" key={r.id}>
          <StatusBadge status={r.status} /> <small>{r.reporter.fullName} · {new Date(r.createdAt).toLocaleString('vi-VN')}</small>
          <p><strong>Lý do:</strong> {r.reason}</p>
          <p><strong>Câu hỏi:</strong> {r.qaLog.question}</p>
          <p><strong>Trả lời:</strong> {formatMath(r.qaLog.answer)}</p>
          {r.qaLog.citations?.map((c) => <CitationCard key={c.chunkId} citation={c} />)}
          {r.status === 'open' && (
            <div className="row">
              <button className="btn" onClick={() => set(r.id, 'resolved')}>Đã xử lý</button>
              <button className="btn btn-light" onClick={() => set(r.id, 'dismissed')}>Bỏ qua</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}