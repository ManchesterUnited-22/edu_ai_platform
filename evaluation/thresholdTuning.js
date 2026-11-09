// Quét ngưỡng tin cậy để chọn giá trị tối ưu. rows: {answerable:boolean, topScore:number}[]
const round2 = (n) => Math.round(n * 100) / 100;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function sweepThresholds(rows, { from = 0.4, to = 0.9, step = 0.05 } = {}) {
  const answerable = rows.filter((r) => r.answerable);
  const unanswerable = rows.filter((r) => !r.answerable);
  const sweep = [];
  for (let t = from; t <= to + 1e-9; t += step) {
    const threshold = round2(t);
    const answerRate = answerable.length
      ? answerable.filter((r) => r.topScore >= threshold).length / answerable.length
      : null;
    const correctRefusalRate = unanswerable.length
      ? unanswerable.filter((r) => r.topScore < threshold).length / unanswerable.length
      : null;
    const balanced = mean([answerRate, correctRefusalRate].filter((v) => v !== null)) ?? 0;
    sweep.push({ threshold, answerRate, correctRefusalRate, balanced: round2(balanced) });
  }
  return sweep;
}

/** Chọn ngưỡng có độ chính xác cân bằng cao nhất; hòa thì lấy ngưỡng CAO hơn (ưu tiên từ chối hơn bịa). */
export function bestThreshold(sweep) {
  return sweep.reduce((best, cur) => (!best || cur.balanced >= best.balanced ? cur : best), null);
}