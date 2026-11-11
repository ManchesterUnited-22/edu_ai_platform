import formatMath from '../../utils/formatMath.js';
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Đang làm bài: truyền selected + onSelect.
 * Sau khi nộp: truyền result = { selected, correctIndex, isCorrect, explanation }.
 */
export default function QuestionCard({ index, question, selected, onSelect, result }) {
  const chosen = result ? result.selected : selected;
  return (
    <div className="card">
      <p>
        <strong>Câu {index + 1}.</strong> {formatMath(question.text)}
        {question.topic && <small> · {question.topic}</small>}
      </p>
      {question.options.map((opt, i) => {
        let cls = 'option';
        if (result) {
          if (i === result.correctIndex) cls += ' correct';
          else if (i === chosen) cls += ' wrong';
        } else if (i === chosen) cls += ' chosen';
        return (
          <label key={i} className={cls}>
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={chosen === i}
              disabled={!!result}
              onChange={() => onSelect?.(question.id, i)}
            />{' '}
            {LETTERS[i]}. {formatMath(opt)}
          </label>
        );
      })}
      {result && (
        <p className={result.isCorrect ? 'ok' : 'error'}>
          {result.isCorrect ? 'Đúng' : chosen == null ? 'Chưa trả lời' : 'Sai'}
          {result.explanation && <><br /><small>{formatMath(result.explanation)}</small></>}
        </p>
      )}
    </div>
  );
}