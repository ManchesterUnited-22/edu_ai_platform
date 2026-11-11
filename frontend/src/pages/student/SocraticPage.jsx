import { useState } from 'react';
import { Link } from 'react-router-dom';
import { askSocratic } from '../../api/socratic.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';

const MAX_MESSAGES = 12; // khớp giới hạn của backend

export default function SocraticPage() {
  const [classId, setClassId] = useState(null);
  const [problem, setProblem] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [hint, setHint] = useState(null);

  const call = async (history) => {
    setBusy(true);
    setNotice('');
    try {
      const data = await askSocratic(classId, problem, history);
      if (data.refused) {
        // Bị từ chối (an toàn / tiêm lệnh): hiện thông báo, không đưa vào lịch sử hội thoại
        setNotice(data.reply);
        return false;
      }
      setMessages([...history, { role: 'tutor', content: data.reply }]);
      setHint(data.hintLevel);
      return true;
    } catch (err) {
      setNotice(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const start = async (e) => {
    e.preventDefault();
    const ok = await call([]);
    if (ok) setStarted(true);
  };

  const send = async (e) => {
    e.preventDefault();
    const history = [...messages, { role: 'student', content: text.trim() }];
    setMessages(history);
    setText('');
    const ok = await call(history);
    if (!ok) setMessages(messages); // hoàn lại để em sửa và gửi lại
  };

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setProblem('');
    setNotice('');
    setHint(null);
  };

  const full = messages.length >= MAX_MESSAGES;

  return (
    <>
      <Link to="/student">← Quay lại</Link>
      <h2>Giải bài từng bước (Socratic)</h2>
      <p>Gia sư sẽ gợi ý dần để em tự tìm ra đáp án, không đưa kết quả cuối.</p>
      <ClassPicker value={classId} onChange={setClassId} />

      {!started ? (
        <form className="card" onSubmit={start}>
          <textarea
            rows={4}
            placeholder="Nhập đề bài (ví dụ: Giải phương trình 2x + 6 = 14)"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            minLength={5}
            maxLength={1500}
            required
          />
          <button className="btn" disabled={busy || !classId}>{busy ? 'Đang suy nghĩ...' : 'Bắt đầu'}</button>
        </form>
      ) : (
        <div className="card">
          <p><strong>Đề bài:</strong> {problem}</p>
          {hint && <small>Mức gợi ý hiện tại: {hint}/3</small>}
          <div className="chat">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                <small>{m.role === 'student' ? 'Em' : 'Gia sư'}</small>
                <p>{m.content}</p>
              </div>
            ))}
            {busy && <p><em>Gia sư đang suy nghĩ...</em></p>}
          </div>

          {full ? (
            <p>Đã đạt giới hạn hội thoại cho bài này. Hãy bắt đầu bài mới.</p>
          ) : (
            <form onSubmit={send} className="row">
              <input
                style={{ flex: 1 }}
                placeholder="Em nghĩ gì / đã thử gì?"
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                required
              />
              <button className="btn" disabled={busy || !text.trim()}>Gửi</button>
            </form>
          )}
          <button className="btn btn-light" onClick={reset}>Bài mới</button>
        </div>
      )}
      {notice && <p className="error">{notice}</p>}
    </>
  );
}