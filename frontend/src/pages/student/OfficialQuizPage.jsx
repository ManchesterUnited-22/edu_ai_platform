import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAttempt, listQuizzes, saveAnswers, startAttempt, submitAttempt } from '../../api/quizzes.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';
import QuestionCard from '../../components/quiz/QuestionCard.jsx';
import QuizResult from '../../components/quiz/QuizResult.jsx';
import useQuizTimer from '../../hooks/useQuizTimer.js';

function Taking({ data, onDone }) {
  const [answers, setAnswers] = useState(data.attempt.answers ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    try {
      onDone(await submitAttempt(data.attempt.id, answersRef.current));
    } catch (err) {
      submittedRef.current = false;
      setError(errorMessage(err));
      setBusy(false);
    }
  }, [data.attempt.id, onDone]);

  const { label, left } = useQuizTimer(data.attempt.deadline, submit); // hết giờ tự nộp

  const select = (id, idx) => {
    const next = { ...answers, [id]: idx };
    setAnswers(next);
    saveAnswers(data.attempt.id, next).catch(() => {}); // lưu nháp, lỗi mạng thì bỏ qua (vẫn nộp được cuối bài)
  };

  return (
    <>
      <div className="card sticky">
        <strong>{data.quiz.title}</strong> · lần {data.attempt.attemptNo}
        <span className={`timer${left < 60 ? ' error' : ''}`}>{label}</span>
      </div>
      <p><small>Trong lúc làm bài, mục Hỏi đáp bị khóa.</small></p>
      {data.questions.map((q, i) => (
        <QuestionCard key={q.id} index={i} question={q} selected={answers[q.id]} onSelect={select} />
      ))}
      {error && <p className="error">{error}</p>}
      <button
        className="btn"
        disabled={busy}
        onClick={() => window.confirm('Nộp bài ngay?') && submit()}
      >
        Nộp bài ({Object.keys(answers).length}/{data.questions.length})
      </button>
    </>
  );
}

export default function OfficialQuizPage() {
  const [classId, setClassId] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [view, setView] = useState(null); // in_progress | submitted
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      setQuizzes(await listQuizzes(classId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId]);

  useEffect(() => { setView(null); load(); }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      setView(await fn());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const finish = useCallback((result) => { setView(result); load(); }, [load]);

  if (view?.status === 'in_progress') return <Taking data={view} onDone={finish} />;
  if (view?.status === 'submitted') return <QuizResult data={view} onClose={() => setView(null)} />;

  const fmt = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '—');
  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Bài kiểm tra</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      {error && <p className="error">{error}</p>}
      {quizzes?.length === 0 && <p>Chưa có bài kiểm tra nào được mở.</p>}
      {quizzes?.map((q) => {
        const used = q.attempts.length;
        const open = q.attempts.find((a) => !a.submittedAt);
        const canStart = open || used < q.maxAttempts;
        return (
          <div className="card" key={q.id}>
            <strong>{q.title}</strong>
            <p>
              {q._count.questions} câu · {q.durationMinutes} phút · đã làm {used}/{q.maxAttempts} lần
              <br />
              <small>Mở: {fmt(q.opensAt)} · Đóng: {fmt(q.closesAt)}</small>
            </p>
            {q.attempts.filter((a) => a.submittedAt).map((a) => (
              <div key={a.id}>
                Lần {a.attemptNo}: <strong>{Number(a.score).toFixed(1)}/10</strong>{' '}
                <button className="btn btn-light" onClick={() => run(() => getAttempt(a.id))}>Xem lại</button>
              </div>
            ))}
            <button className="btn" disabled={!canStart} onClick={() => run(() => startAttempt(q.id))}>
              {open ? 'Làm tiếp' : 'Bắt đầu làm bài'}
            </button>
          </div>
        );
      })}
    </>
  );
}