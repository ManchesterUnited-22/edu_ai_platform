// Cảnh báo phụ huynh: lâu không học, điểm giảm sút, quiz điểm thấp
import defaultPrisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { mean } from '../progress/progressService.js';
import { SCORE_SCALE } from '../quiz/scoring.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const alertConfig = () => ({
  inactiveDays: env.ALERT_INACTIVE_DAYS,
  scoreDrop: env.ALERT_SCORE_DROP,
  lowScore: env.ALERT_LOW_SCORE,
});

/**
 * Hàm thuần (dễ test): quyết định cần cảnh báo gì.
 * attempts: lượt quiz chính thức đã nộp, MỚI NHẤT TRƯỚC ({score, submittedAt, quizTitle}).
 * `dedupeSince`: nếu đã có thông báo cùng loại tạo sau mốc này thì không gửi lại.
 */
export function evaluateAlerts({ studentName, attempts, lastActivityAt }, now, config = alertConfig()) {
  const alerts = [];
  const nowMs = now.getTime();

  // 1) Lâu không học (quiz, luyện tập hoặc hỏi-đáp)
  const idleMs = lastActivityAt ? nowMs - lastActivityAt.getTime() : Infinity;
  if (idleMs >= config.inactiveDays * DAY_MS) {
    alerts.push({
      type: 'inactive',
      // Nhắc lại tối đa mỗi `inactiveDays` ngày, và chỉ khi con chưa học lại
      dedupeSince: new Date(Math.max(lastActivityAt?.getTime() ?? 0, nowMs - config.inactiveDays * DAY_MS)),
      message: lastActivityAt
        ? `${studentName} đã ${Math.floor(idleMs / DAY_MS)} ngày chưa học (không làm quiz hay hỏi bài).`
        : `${studentName} chưa có hoạt động học tập nào.`,
    });
  }

  const latest = attempts[0];
  if (latest && latest.score != null) {
    // 2) Quiz điểm thấp (bài mới nhất)
    if (latest.score < config.lowScore) {
      alerts.push({
        type: 'low_quiz',
        dedupeSince: latest.submittedAt,
        message: `${studentName} được ${latest.score}/${SCORE_SCALE} điểm ở bài "${latest.quizTitle}" (dưới mức ${config.lowScore}).`,
      });
    }

    // 3) Điểm giảm: bài mới nhất thấp hơn trung bình tối đa 3 bài trước đó
    const previous = attempts.slice(1, 4).filter((a) => a.score != null).map((a) => a.score);
    if (previous.length > 0) {
      const average = mean(previous);
      if (average - latest.score >= config.scoreDrop) {
        alerts.push({
          type: 'score_drop',
          dedupeSince: latest.submittedAt,
          message: `${studentName} giảm điểm: bài "${latest.quizTitle}" được ${latest.score}, trong khi trung bình các bài trước là ${average}.`,
        });
      }
    }
  }
  return alerts;
}

const latestDate = (...dates) =>
  dates.filter(Boolean).reduce((max, d) => (!max || d > max ? d : max), null);

async function scanLink(prisma, { parentId, student }, now, config) {
  const [attempts, practice, qa] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { studentId: student.id, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: 4,
      select: { score: true, submittedAt: true, quiz: { select: { title: true } } },
    }),
    prisma.practiceQuiz.findFirst({
      where: { studentId: student.id, submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      select: { submittedAt: true },
    }),
    prisma.qaLog.findFirst({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const rows = attempts.map((a) => ({ score: a.score, submittedAt: a.submittedAt, quizTitle: a.quiz.title }));
  const alerts = evaluateAlerts(
    {
      studentName: student.fullName,
      attempts: rows,
      lastActivityAt: latestDate(rows[0]?.submittedAt, practice?.submittedAt, qa?.createdAt),
    },
    now,
    config,
  );

  let created = 0;
  for (const alert of alerts) {
    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: parentId,
        type: alert.type,
        createdAt: { gte: alert.dedupeSince },
        message: { startsWith: student.fullName }, // phân biệt các con của cùng một phụ huynh
      },
      select: { id: true },
    });
    if (duplicate) continue;
    await prisma.notification.create({
      data: { userId: parentId, type: alert.type, message: alert.message },
    });
    created += 1;
  }
  return created;
}

/** Quét mọi cặp phụ huynh–con. Lỗi ở một cặp không làm hỏng các cặp còn lại. */
export async function runAlertScan({ now = new Date() } = {}, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const config = deps.config ?? alertConfig();

  const links = await prisma.parentLink.findMany({
    select: { parentId: true, student: { select: { id: true, fullName: true } } },
  });

  let created = 0;
  let failed = 0;
  for (const link of links) {
    try {
      created += await scanLink(prisma, link, now, config);
    } catch (error) {
      failed += 1;
      console.error(`Quét cảnh báo lỗi (học sinh ${link.student.id}):`, error.message);
    }
  }
  return { links: links.length, created, failed };
}

export async function listNotifications({ userId, unreadOnly = false }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, type: true, message: true, readAt: true, createdAt: true },
  });
}

export async function markNotificationRead({ userId, notificationId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const found = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true },
  });
  if (!found) throw new AppError('Không tìm thấy thông báo', 404, 'NOTIFICATION_NOT_FOUND');
  if (found.readAt) return found;
  return prisma.notification.update({
    where: { id: found.id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });
}