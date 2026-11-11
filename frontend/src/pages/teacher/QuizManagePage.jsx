import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listQuestions } from '../../api/questions.js';
import { createQuiz, deleteQuiz, listQuizzes, quizAction } from '../../api/quizzes.js';
import { errorMessage } from '../../api/client.js';
import StatusBadge, { NEXT_ACTIONS } from '../../components/common/StatusBadge.jsx';
import formatMath from '../../utils/formatMath.js';

const iso = (local) => (local ? new Date(local).toISOString() : null);

export default function QuizManagePage() {
  const { classId } = useParams();
  const [quizzes, setQuizzes] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [qz, qs] = await Promise.all([listQuizzes(classId), listQuestions(classId, 'published')]);
      setQuizzes(qz);
      setQuestions(qs);
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

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await createQuiz(classId, {
        title: title.trim(),
        durationMinutes: Number(duration),
        maxAttempts: Number(maxAttempts),
        opensAt: iso(opensAt),
        closesAt: iso(closesAt),
        questionIds: picked,
      });
      setTitle('');
      setPicked([]);
    });
  };

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <Link to={`/teacher/classes/${classId}`}>← Quay lại lớp</Link>
      <h2>Bài kiểm tra</h2>
      <form className="card" onSubmit={create}>
        <h3>Tạo bài kiểm tra</h3>
        <div className="row">
          <input style={{ flex: 1 }} placeholder="Tên bài" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Phút <input type="number" min={5} max={180} value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: 70 }} /></label>
          <label>Số lần <input type="number" min={1} max={5} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} style={{ width: 60 }} /></label>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Mở lúc <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
          <label>Đóng lúc <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></label>
        </div>
        <p><strong>Chọn câu hỏi</strong> <small>(chỉ câu đang xuất bản)</small></p>
        {questions.length === 0 && <p>Chưa có câu hỏi nào được xuất bản. Hãy sinh và xuất bản câu hỏi trước.</p>}
        {questions.map((q) => (
          <label key={q.id} style={{ display: 'block' }}>
            <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} /> {formatMath(q.text)}
          </label>
        ))}
        <button className="btn" style={{ marginTop: 8 }} disabled={busy || picked.length === 0}>
          Tạo ({picked.length} câu)
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {quizzes?.length === 0 && <p>Chưa có bài kiểm tra nào.</p>}
      {quizzes?.map((q) => (
        <div className="card" key={q.id}>
          <strong>{q.title}</strong> <StatusBadge status={q.status} />
          <p>
            {q._count.questions} câu · {q.durationMinutes} phút · tối đa {q.maxAttempts} lần · {q._count.attempts} lượt làm
            <br />
            <small>
              Mở: {q.opensAt ? new Date(q.opensAt).toLocaleString('vi-VN') : '—'} · Đóng: {q.closesAt ? new Date(q.closesAt).toLocaleString('vi-VN') : '—'}
            </small>
          </p>
          <div className="row">
            {(NEXT_ACTIONS[q.status] ?? []).map(([action, label]) => (
              <button key={action} className="btn" disabled={busy} onClick={() => run(() => quizAction(q.id, action))}>{label}</button>
            ))}
            <button className="btn btn-light" disabled={busy} onClick={() => window.confirm('Xóa bài kiểm tra?') && run(() => deleteQuiz(q.id))}>Xóa</button>
          </div>
        </div>
      ))}
    </>
  );
}