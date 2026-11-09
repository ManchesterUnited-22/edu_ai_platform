// Xử lý tiến độ học tập
import prisma from '../config/db.js';
import { getStudentProgress } from '../services/progress/progressService.js';
import { AppError } from '../utils/AppError.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

/** Học sinh xem tiến độ của chính mình. */
export const myProgress = handle(async (req, res) => {
  const progress = await getStudentProgress({ studentId: req.user.id, classId: req.classRecord.id });
  return res.json({ progress });
});

/** Giáo viên (chủ lớp) xem tiến độ một học sinh đã ghi danh trong lớp. */
export const studentProgress = handle(async (req, res) => {
  const enrolled = await prisma.enrollment.findFirst({
    where: { classId: req.classRecord.id, studentId: req.params.studentId },
    select: { id: true },
  });
  if (!enrolled) throw new AppError('Học sinh không thuộc lớp này', 404, 'STUDENT_NOT_FOUND');

  const progress = await getStudentProgress({
    studentId: req.params.studentId,
    classId: req.classRecord.id,
  });
  return res.json({ progress });
});