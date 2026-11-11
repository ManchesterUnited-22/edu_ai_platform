import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deleteDocument, documentAction, listDocuments, uploadDocument } from '../../api/documents.js';
import { errorMessage } from '../../api/client.js';
import StatusBadge, { NEXT_ACTIONS } from '../../components/common/StatusBadge.jsx';

export default function DocumentUploadPage() {
  const { classId } = useParams();
  const [docs, setDocs] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    () => listDocuments(classId).then(setDocs).catch((e) => setError(errorMessage(e))),
    [classId],
  );
  useEffect(() => { load(); }, [load]);

  // Đang xử lý nền thì tự làm mới mỗi 3 giây
  const pending = docs?.some((d) => ['uploaded', 'processing'].includes(d.processStatus));
  useEffect(() => {
    if (!pending) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [pending, load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const upload = (e) => {
    e.preventDefault();
    run(async () => { await uploadDocument(classId, file); setFile(null); e.target.reset(); });
  };

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Tài liệu</h2>
      <form className="card" onSubmit={upload}>
        <h3>Tải tài liệu lên</h3>
        <p><small>Hỗ trợ PDF, Word (.docx), ảnh. Sau khi xử lý xong: Duyệt rồi Xuất bản thì học sinh mới thấy và hỏi đáp được.</small></p>
        <div className="row">
          <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0] ?? null)} required />
          <button className="btn" disabled={busy || !file}>{busy ? 'Đang tải...' : 'Tải lên'}</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      {docs?.length === 0 && <p>Chưa có tài liệu.</p>}
      {docs?.map((d) => (
        <div className="card" key={d.id}>
          <strong>{d.fileName}</strong>{' '}
          <StatusBadge status={d.processStatus} /> <StatusBadge status={d.publishStatus} />
          <p><small>{d._count.chunks} đoạn · {new Date(d.createdAt).toLocaleString('vi-VN')}</small></p>
          {d.processStatus === 'failed' && <p className="error">{d.errorMessage}</p>}
          <div className="row">
            {d.processStatus === 'ready' &&
              (NEXT_ACTIONS[d.publishStatus] ?? []).map(([action, label]) => (
                <button key={action} className="btn" disabled={busy} onClick={() => run(() => documentAction(d.id, action))}>
                  {label}
                </button>
              ))}
            {['ready', 'failed'].includes(d.processStatus) && d.publishStatus !== 'published' && (
              <button className="btn btn-light" disabled={busy} onClick={() => run(() => documentAction(d.id, 'reprocess'))}>
                Xử lý lại
              </button>
            )}
            <button
              className="btn btn-light"
              disabled={busy}
              onClick={() => window.confirm(`Xóa "${d.fileName}"?`) && run(() => deleteDocument(d.id))}
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
    </>
  );
}