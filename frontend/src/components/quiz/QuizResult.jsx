import QuestionCard from './QuestionCard.jsx';

/** data = phản hồi "submitted" của bài kiểm tra hoặc luyện tập. */
export default function QuizResult({ data, onClose }) {
  const info = data.attempt ?? data.practice;
  return (
    <>
      <div className="card">
               <h3>Kết quả</h3>
        <div className="grade-row">
          <span className="grade">
            {Number(info.score).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <small>/10</small>
          </span>
          <span>Đúng {info.correct}/{info.total} câu</span>
        </div>
        {data.late && <p className="error">Nộp muộn: bài được chấm theo thời điểm hết giờ.</p>}
        {onClose && <button className="btn btn-light" onClick={onClose}>Đóng</button>}
      </div>
      {data.questions.map((q, i) => (
        <QuestionCard key={q.id} index={i} question={q} result={q} />
      ))}
    </>
  );
}