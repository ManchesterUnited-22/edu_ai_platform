import QuestionCard from './QuestionCard.jsx';

/** data = phản hồi "submitted" của bài kiểm tra hoặc luyện tập. */
export default function QuizResult({ data, onClose }) {
  const info = data.attempt ?? data.practice;
  return (
    <>
      <div className="card">
        <h3>Kết quả</h3>
        <p>
          Điểm: <strong>{Number(info.score).toFixed(1)}</strong> / 10 · Đúng {info.correct}/{info.total}
        </p>
        {data.late && <p className="error">Nộp muộn: bài được chấm theo thời điểm hết giờ.</p>}
        {onClose && <button className="btn btn-light" onClick={onClose}>Đóng</button>}
      </div>
      {data.questions.map((q, i) => (
        <QuestionCard key={q.id} index={i} question={q} result={q} />
      ))}
    </>
  );
}