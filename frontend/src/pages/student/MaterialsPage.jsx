import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listDocuments } from '../../api/documents.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';
import DocumentViewer from '../../components/documents/DocumentViewer.jsx';

const TYPE_LABEL = (mime) =>
  mime === 'application/pdf' ? 'PDF' : mime.startsWith('image/') ? 'Ảnh' : 'Word';

export default function MaterialsPage() {
  const [classId, setClassId] = useState(null);
  const [docs, setDocs] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim().toLocaleLowerCase('vi-VN') ?? '';

  useEffect(() => {
    if (!classId) return;
    setDocs(null);
    setOpen(null);
    setError('');
    listDocuments(classId).then(setDocs).catch((err) => setError(errorMessage(err)));
  }, [classId]);
  const visibleDocs = useMemo(() => {
    if (!query) return docs ?? [];
    return (docs ?? []).filter((doc) => doc.fileName.toLocaleLowerCase('vi-VN').includes(query));
  }, [docs, query]);

  return (
    <>
      {open ? (
        <button className="btn btn-light" onClick={() => setOpen(null)}>← Danh sách tài liệu</button>
      ) : (
        <Link to="/student">← Quay lại</Link>
      )}
      <h2>{open ? open.fileName : 'Tài liệu của lớp'}</h2>

      {/* luôn giữ ô chọn lớp để không bị mất lựa chọn khi đang đọc */}
      <div hidden={!!open}><ClassPicker value={classId} onChange={setClassId} /></div>

      {error && <p className="error">{error}</p>}
      {open && <DocumentViewer doc={open} />}

      {!open && docs?.length === 0 && <p>Giáo viên chưa đăng tài liệu nào.</p>}
      {!open && docs?.length > 0 && visibleDocs.length === 0 && <p>Không tìm thấy tài liệu phù hợp với “{searchParams.get('q')}”.</p>}
      {!open && visibleDocs.map((d) => (
        <div className="card" key={d.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <strong>{d.fileName}</strong>{' '}
              <span className="tag">{TYPE_LABEL(d.mimeType)}</span>
              <br />
              <small>Đăng ngày {d.publishedAt ? new Date(d.publishedAt).toLocaleDateString('vi-VN') : '—'}</small>
            </span>
            <button className="btn" onClick={() => setOpen(d)}>Mở tài liệu</button>
          </div>
        </div>
      ))}
    </>
  );
}