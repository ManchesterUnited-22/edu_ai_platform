import { useState } from 'react';
import { reportAnswer } from '../../api/qa.js';
import { errorMessage } from '../../api/client.js';

export default function ReportWrongAnswerButton({ qaLogId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState('idle'); // idle | sent
  const [error, setError] = useState('');

  if (state === 'sent') return <small className="ok">Đã gửi báo cáo cho giáo viên.</small>;
  if (!open) return <button className="btn btn-light" onClick={() => setOpen(true)}>Báo câu trả lời sai</button>;

  const send = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await reportAnswer(qaLogId, reason.trim());
      setState('sent');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form className="row" onSubmit={send}>
      <input
        style={{ flex: 1 }}
        placeholder="Câu trả lời sai ở đâu?"
        value={reason}
        minLength={3}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      <button className="btn">Gửi</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}