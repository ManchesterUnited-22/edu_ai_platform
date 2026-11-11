import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { askQuestion, getHistory } from '../../api/qa.js';
import { errorMessage } from '../../api/client.js';
import ChatBox from '../../components/chat/ChatBox.jsx';
import ClassPicker from '../../components/common/ClassPicker.jsx';

export default function AskPage() {
  const [classId, setClassId] = useState(null);
  const [items, setItems] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    setItems([]);
    getHistory(classId)
      .then((logs) =>
        setItems(
          [...logs].reverse().map((l) => ({
            key: l.id, qaLogId: l.id, question: l.question, answer: l.answer,
            citations: l.citations ?? [], refused: l.refused,
          })),
        ),
      )
      .catch((err) => setError(errorMessage(err)));
  }, [classId]);

  const send = async (e) => {
    e.preventDefault();
    const q = question.trim();
    setBusy(true);
    setError('');
    try {
      const r = await askQuestion(classId, q);
      setItems((list) => [
        ...list,
        { key: r.qaLogId, qaLogId: r.qaLogId, question: q, answer: r.answer, citations: r.citations ?? [], refused: r.refused },
      ]);
      setQuestion('');
    } catch (err) {
      setError(errorMessage(err)); // ví dụ: đang làm bài kiểm tra (423) hoặc hỏi quá nhanh (429)
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Hỏi đáp theo tài liệu</h2>
      <ClassPicker value={classId} onChange={setClassId} />
      <div className="card">
        <ChatBox items={items} busy={busy} />
        <form className="row" onSubmit={send}>
          <input
            style={{ flex: 1 }}
            placeholder="Hỏi về nội dung tài liệu của lớp..."
            value={question}
            maxLength={1000}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
          <button className="btn" disabled={busy || !classId || !question.trim()}>Hỏi</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}