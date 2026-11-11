import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDocument, listDocuments } from '../../api/documents.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';
import formatMath from '../../utils/formatMath.js';
function DocumentItem({ doc }) {
  const [chunks, setChunks] = useState(null);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (chunks) return setChunks(null);
    try {
      setChunks((await getDocument(doc.id)).chunks);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="card">
      <strong>{doc.fileName}</strong>{' '}
      <small>
        {doc._count.chunks} đoạn · đăng {doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('vi-VN') : '—'}
      </small>
      <div><button className="btn btn-light" onClick={toggle}>{chunks ? 'Ẩn nội dung' : 'Xem nội dung'}</button></div>
      {error && <p className="error">{error}</p>}
      {chunks?.map((c) => (
        <blockquote key={c.id}>
          <small>Đoạn {c.chunkIndex + 1}{c.pageNumber ? ` · trang ${c.pageNumber}` : ''}</small>
          <p>{formatMath(c.text)}</p>
        </blockquote>
      ))}
    </div>
  );
}

export default function MaterialsPage() {
  const [classId, setClassId] = useState(null);
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    setDocs(null);
    listDocuments(classId).then(setDocs).catch((err) => setError(errorMessage(err)));
  }, [classId]);

  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Tài liệu của lớp</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      {error && <p className="error">{error}</p>}
      {docs?.length === 0 && <p>Giáo viên chưa đăng tài liệu nào.</p>}
      {docs?.map((d) => <DocumentItem key={d.id} doc={d} />)}
    </>
  );
}