import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { contentAction, deleteContent, generateLectureOutline, generateOutline, getContent, listContents } from '../../api/contents.js';
import { listDocuments } from '../../api/documents.js';
import { errorMessage } from '../../api/client.js';
import ContentBody from '../../components/editor/ContentBody.jsx';
import StatusBadge, { NEXT_ACTIONS } from '../../components/common/StatusBadge.jsx';

function ContentItem({ item, onAction, onDelete, busy }) {
  const [body, setBody] = useState(null);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (body) return setBody(null);
    try {
      setBody((await getContent(item.id)).body);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="card">
      <strong>{item.title}</strong>{' '}
      <small>{item.type === 'outline' ? 'Đề cương' : 'Outline bài giảng'} · v{item.version}</small>{' '}
      <StatusBadge status={item.status} />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-light" onClick={toggle}>{body ? 'Ẩn' : 'Xem'}</button>
        {(NEXT_ACTIONS[item.status] ?? []).map(([action, label]) => (
          <button key={action} className="btn" disabled={busy} onClick={() => onAction(item.id, action)}>{label}</button>
        ))}
        <button className="btn btn-light" disabled={busy} onClick={() => window.confirm('Xóa nội dung này?') && onDelete(item.id)}>Xóa</button>
      </div>
      {error && <p className="error">{error}</p>}
      {body && <ContentBody type={item.type} body={body} />}
    </div>
  );
}

export default function GenerateOutlinePage() {
  const { classId } = useParams();
  const [docs, setDocs] = useState([]);
  const [contents, setContents] = useState(null);
  const [type, setType] = useState('outline');
  const [selected, setSelected] = useState([]);
  const [focus, setFocus] = useState('');
  const [duration, setDuration] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([listDocuments(classId), listContents(classId)]);
      setDocs(d.filter((x) => x.publishStatus === 'published'));
      setContents(c);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId]);
  useEffect(() => { load(); }, [load]);

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

  const generate = (e) => {
    e.preventDefault();
    const body = {
      ...(selected.length ? { documentIds: selected } : {}),
      ...(focus.trim() ? { focus: focus.trim() } : {}),
    };
    run(() =>
      type === 'outline'
        ? generateOutline(classId, body)
        : generateLectureOutline(classId, { ...body, durationMinutes: Number(duration) }),
    );
  };

  const toggleDoc = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Đề cương và outline bài giảng (AI)</h2>
      <form className="card" onSubmit={generate}>
        <div className="row">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="outline">Đề cương ôn tập</option>
            <option value="lecture_outline">Outline bài giảng</option>
          </select>
          {type === 'lecture_outline' && (
            <label>Thời lượng (phút){' '}
              <input type="number" min={15} max={180} value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: 80 }} />
            </label>
          )}
        </div>
        <p><strong>Tài liệu nguồn</strong> <small>(đã xuất bản; không chọn thì dùng tất cả)</small></p>
        {docs.length === 0 && <p>Chưa có tài liệu nào được xuất bản.</p>}
        {docs.map((d) => (
          <label key={d.id} style={{ display: 'block' }}>
            <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleDoc(d.id)} /> {d.fileName}
          </label>
        ))}
        <input style={{ width: '100%', marginTop: 8 }} placeholder="Trọng tâm (không bắt buộc)" value={focus} maxLength={500} onChange={(e) => setFocus(e.target.value)} />
        <button className="btn" style={{ marginTop: 8 }} disabled={busy || docs.length === 0}>
          {busy ? 'Đang sinh...' : 'Sinh nội dung'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {contents?.length === 0 && <p>Chưa có nội dung nào.</p>}
      {contents?.map((c) => (
        <ContentItem
          key={c.id}
          item={c}
          busy={busy}
          onAction={(id, action) => run(() => contentAction(id, action))}
          onDelete={(id) => run(() => deleteContent(id))}
        />
      ))}
    </>
  );
}