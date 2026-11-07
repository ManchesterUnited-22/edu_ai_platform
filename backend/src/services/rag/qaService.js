// Hỏi-đáp của học sinh: chạy pipeline RAG, lưu nhật ký, lịch sử, báo cáo câu trả lời sai
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { answerQuestion } from './pipeline.js';

export async function askQuestion({ studentId, classId, question }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const result = await answerQuestion({ question, classId }, deps);

  const log = await prisma.qaLog.create({
    data: {
      studentId,
      classId,
      question,
      answer: result.answer,
      citations: result.citations,
      topScore: result.topScore,
      refused: result.refused,
    },
    select: { id: true },
  });

  return {
    qaLogId: log.id,
    answer: result.answer,
    citations: result.citations,
    refused: result.refused,
    refusalReason: result.reason,
    topScore: result.topScore,
  };
}

/** Học sinh xem lịch sử của chính mình; giáo viên xem toàn lớp. */
export async function listHistory({ user, classId, limit = 50 }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const isTeacher = user.role === 'teacher';

  return prisma.qaLog.findMany({
    where: { classId, ...(isTeacher ? {} : { studentId: user.id }) },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      question: true,
      answer: true,
      citations: true,
      topScore: true,
      refused: true,
      createdAt: true,
      ...(isTeacher ? { student: { select: { id: true, fullName: true } } } : {}),
    },
  });
}

/** Học sinh báo cáo câu trả lời sai của chính mình. */
export async function reportAnswer({ user, qaLogId, reason }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const log = await prisma.qaLog.findUnique({
    where: { id: qaLogId },
    select: { id: true, studentId: true },
  });
  // Không phải của mình thì coi như không tồn tại, tránh lộ lịch sử người khác
  if (!log || log.studentId !== user.id) {
    throw new AppError('Không tìm thấy câu trả lời', 404, 'QA_LOG_NOT_FOUND');
  }

  const existing = await prisma.answerReport.findFirst({
    where: { qaLogId, reporterId: user.id, status: 'open' },
    select: { id: true },
  });
  if (existing) {
    throw new AppError('Bạn đã báo cáo câu trả lời này rồi', 409, 'ALREADY_REPORTED');
  }

  return prisma.answerReport.create({
    data: { qaLogId, reporterId: user.id, reason },
    select: { id: true, status: true, createdAt: true },
  });
}

export async function listAnswerReports({ classId, status }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  return prisma.answerReport.findMany({
    where: { qaLog: { classId }, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      reporter: { select: { id: true, fullName: true } },
      qaLog: {
        select: { id: true, question: true, answer: true, citations: true, topScore: true, refused: true },
      },
    },
  });
}

/** Giáo viên xử lý báo cáo (chỉ báo cáo thuộc lớp của mình). */
export async function updateAnswerReportStatus({ teacherId, reportId, status }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const report = await prisma.answerReport.findUnique({
    where: { id: reportId },
    select: { id: true, qaLog: { select: { class: { select: { teacherId: true } } } } },
  });
  if (!report || report.qaLog.class.teacherId !== teacherId) {
    throw new AppError('Không tìm thấy báo cáo', 404, 'REPORT_NOT_FOUND');
  }

  return prisma.answerReport.update({
    where: { id: reportId },
    data: { status },
    select: { id: true, status: true },
  });
}