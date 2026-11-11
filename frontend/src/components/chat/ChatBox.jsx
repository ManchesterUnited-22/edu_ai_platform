import CitationCard from './CitationCard.jsx';
import ReportWrongAnswerButton from './ReportWrongAnswerButton.jsx';
import formatMath from '../../utils/formatMath.js';
/** items: [{ key, question, answer, citations, refused, qaLogId }] theo thứ tự cũ → mới */
export default function ChatBox({ items, busy }) {
  return (
    <div className="chat">
      {items.map((it) => (
        <div key={it.key}>
          <div className="bubble student"><small>Em</small><p>{it.question}</p></div>
          <div className={`bubble tutor${it.refused ? ' refused' : ''}`}>
            <small>Trợ lý</small>
            <p>{formatMath(it.answer)}</p>
            {it.citations?.map((c) => <CitationCard key={c.chunkId} citation={c} />)}
            {it.qaLogId && !it.refused && <ReportWrongAnswerButton qaLogId={it.qaLogId} />}
          </div>
        </div>
      ))}
      {busy && <p><em>Đang tìm trong tài liệu...</em></p>}
    </div>
  );
}