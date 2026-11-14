import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { publicUser } from './auth.controller.js';
import { reviewTeacherProfile } from '../services/teacherVerification.js';

const riskFor = (events) => {
  const score = events.reduce((total, event) => total + event.riskScore, 0);
  return Math.min(100, score);
};

export const listTeacherApprovals = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'teacher', status: 'pending' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, fullName: true, role: true, status: true, teacherType: true, verificationLevel: true, createdAt: true },
    });
    const events = await prisma.securityEvent.findMany({
      where: { type: 'pending_teacher_access', targetUserId: { in: users.map((user) => user.id) } },
      orderBy: { createdAt: 'desc' },
      select: { targetUserId: true, riskScore: true, riskReasons: true, createdAt: true },
    });
    const byUser = new Map();
    for (const event of events) {
      const current = byUser.get(event.targetUserId) ?? [];
      current.push(event);
      byUser.set(event.targetUserId, current);
    }

    return res.json({
      approvals: users.map((user) => ({
        user: publicUser(user),
        aiRiskSuggestion: {
          score: riskFor(byUser.get(user.id) ?? []),
          label: riskFor(byUser.get(user.id) ?? []) >= 60 ? 'Cần xem kỹ' : 'Rủi ro thấp',
          note: 'Đây là điểm cảnh báo theo luật bảo mật, không phải kết quả phân tích hồ sơ bằng Gemini.',
        },
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const reviewTeacher = async (req, res, next) => {
  try {
    const status = req.body.action === 'approve' ? 'active' : req.body.action === 'reject' ? 'rejected' : null;
    if (!status) throw new AppError('Hành động duyệt không hợp lệ', 400, 'INVALID_REVIEW_ACTION');

    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, role: 'teacher', status: 'pending' },
    });
    if (!user) throw new AppError('Không tìm thấy yêu cầu giáo viên đang chờ duyệt', 404, 'TEACHER_APPROVAL_NOT_FOUND');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status },
    });
    return res.json({ user: publicUser(updated), message: status === 'active' ? 'Đã duyệt giáo viên' : 'Đã từ chối giáo viên' });
  } catch (error) {
    return next(error);
  }
};

export const listSecurityEvents = async (req, res, next) => {
  try {
    const events = await prisma.securityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        targetUser: { select: { fullName: true, email: true } },
        actorUser: { select: { fullName: true, email: true } },
      },
    });
    return res.json({ events });
  } catch (error) {
    return next(error);
  }
};

export const listTeacherAiReviews = async (req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'teacher' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, role: true, status: true,
        teacherType: true, verificationLevel: true, teacherBio: true,
        teacherSubjects: true, teacherExperienceYears: true, createdAt: true,
      },
    });
    const reviews = await prisma.securityEvent.findMany({
      where: { type: 'teacher_ai_review', targetUserId: { in: teachers.map((teacher) => teacher.id) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, targetUserId: true, riskScore: true, riskReasons: true, metadata: true, createdAt: true },
    });
    const latestByUser = new Map();
    for (const review of reviews) {
      if (!latestByUser.has(review.targetUserId)) latestByUser.set(review.targetUserId, review);
    }

    return res.json({
      reviews: teachers.map((teacher) => ({
        user: publicUser(teacher),
        review: latestByUser.get(teacher.id) ?? null,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

export const runTeacherAiReview = async (req, res, next) => {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: req.params.userId, role: 'teacher' },
    });
    if (!teacher) throw new AppError('Không tìm thấy giáo viên', 404, 'TEACHER_NOT_FOUND');

    const review = await reviewTeacherProfile(teacher);
    const event = await prisma.securityEvent.create({
      data: {
        type: 'teacher_ai_review',
        targetUserId: teacher.id,
        actorUserId: req.user.id,
        riskScore: review.riskScore,
        riskReasons: review.reasons,
        metadata: {
          source: review.source,
          label: review.label,
          recommendedLevel: review.recommendedLevel,
          fallbackReason: review.fallbackReason ?? null,
        },
      },
    });
    return res.json({ review: event });
  } catch (error) {
    return next(error);
  }
};
