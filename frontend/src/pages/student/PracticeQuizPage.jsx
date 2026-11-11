import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPractice, getPractice, listPractice, submitPractice } from '../../api/quizzes.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';
import QuestionCard from '../../components/quiz/QuestionCard.jsx';
import QuizResult from '../../components/quiz/QuizResult.jsx';

export default function PracticeQuizPage() {
  const [classId, setClassId] = useState(null);
  const [list, setList] = useState(null); // { practiceQuizzes, quota }
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState('');
  const [view, setView] = useState(null); // dữ liệu in_progress hoặc submitted
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      setList(await listPractice(classId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId]);

  useEffect(() => { setView(null); load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await createPractice(classId, { count: Number(count), ...(topic.trim() ? { topic: topic.trim() } : {}) });
      setAnswers({});
      setView(data);
      load();
    });
  };

  const open = (id) =>
    run(async () => {
      const data = await getPractice(id);
      setAnswers({});
      setView(data);
    });

  const submit = () =>
    run(async () => {
      setView(await submitPractice(view.practice.id, answers));
      load();
    });

  if (view?.status === 'submitted') return <><QuizResult data={view} onClose={() => setView(null)} /></>;

  if (view?.status === 'in_progress') {
    const done = Object.keys(answers).length;
    return (
      <>
        <h2>Luyện tập{view.practice.topic ? `: ${view.practice.topic}` : ''}</h2>
        {view.questions.map((q, i) => (
          <QuestionCard key={q.id} index={i} question={q} selected={answers[q.id]}
            onSelect={(id, idx) => setAnswers((a) => ({ ...a, [id]: idx }))} />
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy} onClick={submit}>
          Nộp bài ({done}/{view.questions.length})
        </button>
      </>
    );
  }

  const quota = list?.quota;
  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Luyện tập</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      <form className="card" onSubmit={create}>
        <h3>Tạo bài luyện tập mới</h3>
        {quota && <p>Hôm nay còn <strong>{quota.remaining}</strong>/{quota.limit} lượt tạo.</p>}
        <div className="row">
          <label>Số câu{' '}
            <input type="number" min={3} max={10} value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 70 }} />
          </label>
          <input style={{ flex: 1 }} placeholder="Chủ đề (không bắt buộc)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <button className="btn" disabled={busy || !classId || quota?.remaining === 0}>
            {busy ? 'Đang tạo...' : 'Tạo'}
          </button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}

      <h3>Các bài đã tạo</h3>
      {list?.practiceQuizzes.length === 0 && <p>Chưa có bài nào.</p>}
      {list?.practiceQuizzes.map((p) => (
        <div className="card" key={p.id}>
          {p.topic ?? 'Tổng hợp'} · {new Date(p.createdAt).toLocaleString('vi-VN')}{' '}
          {p.submittedAt ? <strong>· {Number(p.score).toFixed(1)}/10</strong> : <em>· chưa nộp</em>}{' '}
          <button className="btn btn-light" onClick={() => open(p.id)}>{p.submittedAt ? 'Xem lại' : 'Làm tiếp'}</button>
        </div>
      ))}
    </>
  );
}