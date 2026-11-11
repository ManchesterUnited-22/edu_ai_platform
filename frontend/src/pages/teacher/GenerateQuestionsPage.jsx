import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listDocuments } from '../../api/documents.js';
import { bulkStatus, deleteQuestion, generateQuestions, listQuestions } from '../../api/questions.js';
import { errorMessage } from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import formatMath from '../../utils/formatMath.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function GenerateQuestionsPage() {
  const { classId } = useParams();
  const [docs, setDocs] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, q] = await Promise.all([listDocuments(classId), listQuestions(classId, filter || undefined)]);
      setDocs(d.filter((x) => x.publishStatus === 'published'));
      setQuestions(q);
      setPicked([]);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId, filter]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setInfo('');
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
    run(async () => {
      const r = await generateQuestions(classId, {
        count: Number(count),
        ...(selectedDocs.length ? { documentIds: selectedDocs } : {}),
        ...(difficulty ? { difficulty: Number(difficulty) } : {}),
        ...(topic.trim() ? { topic: topic.trim() } : {}),
      });
      setInfo(`Đã tạo ${r.created}/${r.requested} câu. Câu bị loại (sai cấu trúc, trùng...) sẽ không hiện.`);
    });
  };

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const bulk = (action) => run(() => bulkStatus(classId, picked, action));

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Câu hỏi (AI)</h2>
      <form className="card" onSubmit={generate}>
        <h3>Sinh câu hỏi từ tài liệu đã xuất bản</h3>
        {docs.length === 0 && <p>Chưa có tài liệu nào được xuất bản.</p>}
        {docs.map((d) => (
          <label key={d.id} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={selectedDocs.includes(d.id)}
              onChange={() => setSelectedDocs((s) => (s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id]))}
            /> {d.fileName}
          </label>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <label>Số câu <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 70 }} /></label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Mọi độ khó</option>
            <option value="1">Dễ</option><option value="2">Vừa</option><option value="3">Khó</option>
          </select>
          <input style={{ flex: 1 }} placeholder="Chủ đề (không bắt buộc)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button className="btn" disabled={busy || docs.length === 0}>{busy ? 'Đang sinh...' : 'Sinh câu hỏi'}</button>
        </div>
      </form>
      {info && <p className="ok">{info}</p>}
      {error && <p className="error">{error}</p>}

      <div className="row" style={{ alignItems: 'center' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          <option value="draft">Nháp</option><option value="reviewed">Đã duyệt</option>
          <option value="published">Đang xuất bản</option><option value="revoked">Đã thu hồi</option>
        </select>
        <span>Đã chọn {picked.length}</span>
        <button className="btn btn-light" disabled={busy || !picked.length} onClick={() => bulk('review')}>Duyệt</button>
        <button className="btn btn-light" disabled={busy || !picked.length} onClick={() => bulk('publish')}>Xuất bản</button>
        <button className="btn btn-light" disabled={busy || !picked.length} onClick={() => bulk('unpublish')}>Thu hồi</button>
      </div>

      {questions?.length === 0 && <p>Chưa có câu hỏi nào.</p>}
      {questions?.map((q) => (
        <div className="card" key={q.id}>
          <label>
            <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} />{' '}
            <strong>{formatMath(q.text)}</strong>
          </label>{' '}
          <StatusBadge status={q.status} />
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {q.options.map((o, i) => (
              <li key={i} className={i === q.correctIndex ? 'ok' : ''}>{LETTERS[i]}. {formatMath(o)}</li>
            ))}
          </ul>
          <small>
            {q.topic && `Chủ đề: ${q.topic} · `}Độ khó {q.difficulty}
            {q.explanation && <><br />Lời giải: {formatMath(q.explanation)}</>}
          </small>
          <div>
            <button
              className="btn btn-light"
              disabled={busy}
              onClick={() => window.confirm('Xóa câu hỏi này?') && run(() => deleteQuestion(q.id))}
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
    </>
  );
}