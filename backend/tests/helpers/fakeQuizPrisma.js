// Prisma giả trong bộ nhớ cho luồng làm bài quiz (chỉ hỗ trợ đúng các truy vấn service đang dùng)
export function createFakeQuizPrisma({
  quizzes = [],
  questions = [],
  quizQuestions = [],
  enrollments = [],
  attempts = [],
} = {}) {
  const db = {
    quizzes: quizzes.map((q) => ({ opensAt: null, closesAt: null, maxAttempts: 2, ...q })),
    questions,
    quizQuestions,
    enrollments,
    attempts: attempts.map((a) => ({ answers: null, score: null, submittedAt: null, ...a })),
  };
  let counter = 0;

  const match = (row, where = {}) =>
    Object.entries(where).every(([key, cond]) => row[key] === cond);
  const withQuiz = (a) => ({ ...a, quiz: db.quizzes.find((q) => q.id === a.quizId) });

  const prisma = {
    db,
    raceOnce: false, // giả lập hai yêu cầu "bắt đầu" cùng lúc
    quiz: {
      findUnique: async ({ where, include }) => {
        const quiz = db.quizzes.find((q) => q.id === where.id);
        if (!quiz) return null;
        const studentId = include?.class?.select?.enrollments?.where?.studentId;
        return {
          ...quiz,
          class: {
            enrollments: db.enrollments.filter(
              (e) => e.classId === quiz.classId && (!studentId || e.studentId === studentId),
            ),
          },
        };
      },
    },
    quizQuestion: {
      findMany: async ({ where }) =>
        db.quizQuestions
          .filter((r) => r.quizId === where.quizId)
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ ...r, question: db.questions.find((q) => q.id === r.questionId) })),
    },
    quizAttempt: {
      findMany: async ({ where = {}, orderBy }) => {
        const rows = db.attempts.filter((a) => match(a, where)).map(withQuiz);
        if (orderBy?.attemptNo) rows.sort((a, b) => a.attemptNo - b.attemptNo);
        return rows;
      },
      count: async ({ where }) => db.attempts.filter((a) => match(a, where)).length,
      findUnique: async ({ where }) => {
        const a = db.attempts.find((x) => x.id === where.id);
        return a ? withQuiz(a) : null;
      },
      create: async ({ data }) => {
        counter += 1;
        const row = { id: `att${counter}`, answers: null, score: null, submittedAt: null, ...data };
        const clash = db.attempts.some(
          (a) => a.quizId === row.quizId && a.studentId === row.studentId && a.attemptNo === row.attemptNo,
        );
        if (clash || prisma.raceOnce) {
          if (prisma.raceOnce && !clash) db.attempts.push(row); // yêu cầu kia đã ghi trước
          prisma.raceOnce = false;
          throw Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        }
        db.attempts.push(row);
        return withQuiz(row);
      },
      updateMany: async ({ where, data }) => {
        const rows = db.attempts.filter((a) => match(a, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
  };
  return prisma;
}