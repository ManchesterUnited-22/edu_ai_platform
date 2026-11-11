import formatMath from '../../utils/formatMath.js';

export default function ContentBody({ type, body }) {
  if (!body) return null;
  if (type === 'outline') {
    return (
      <>
        <p>{formatMath(body.summary)}</p>
        {body.sections?.map((s, i) => (
          <div key={i}>
            <h4>{formatMath(s.heading)}</h4>
            <ul>{s.points.map((p, j) => <li key={j}>{formatMath(p)}</li>)}</ul>
            {s.keyTerms?.length > 0 && <small>Từ khóa: {s.keyTerms.join(', ')}</small>}
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      <h4>Mục tiêu</h4>
      <ul>{body.objectives?.map((o, i) => <li key={i}>{formatMath(o)}</li>)}</ul>
      {body.sections?.map((s, i) => (
        <div key={i}>
          <h4>{formatMath(s.title)} <small>({s.minutes} phút)</small></h4>
          <ul>{s.points.map((p, j) => <li key={j}>{formatMath(p)}</li>)}</ul>
          {s.activity && <small>Hoạt động: {formatMath(s.activity)}</small>}
        </div>
      ))}
    </>
  );
}