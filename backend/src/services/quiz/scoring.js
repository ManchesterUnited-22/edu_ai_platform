// Chấm điểm trắc nghiệm (thang điểm 10)

export const SCORE_SCALE = 10;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {{id:string, options:string[], correctIndex:number, topic?:string|null}[]} questions
 * @param {Record<string, number>} answers  questionId -> chỉ số phương án đã chọn
 * @returns {{score:number, correct:number, total:number,
 *   details:{questionId:string, topic:string|null, selected:number|null, correctIndex:number, isCorrect:boolean}[]}}
 */
export function gradeAnswers(questions, answers = {}) {
  const details = questions.map((q) => {
    const raw = answers?.[q.id];
    // Chỉ số ngoài phạm vi / sai kiểu coi như chưa trả lời
    const selected = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    return {
      questionId: q.id,
      topic: q.topic ?? null,
      selected,
      correctIndex: q.correctIndex,
      isCorrect: selected === q.correctIndex,
    };
  });

  const correct = details.filter((d) => d.isCorrect).length;
  const total = questions.length;
  return {
    score: total === 0 ? 0 : round2((correct / total) * SCORE_SCALE),
    correct,
    total,
    details,
  };
}

/** Gom kết quả theo chủ đề (dùng để tìm chủ đề yếu). */
export function summarizeByTopic(details) {
  const byTopic = {};
  for (const d of details) {
    const key = d.topic || 'Khác';
    byTopic[key] ??= { correct: 0, total: 0 };
    byTopic[key].total += 1;
    if (d.isCorrect) byTopic[key].correct += 1;
  }
  return byTopic;
}