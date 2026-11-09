// Xử lý phụ huynh: liên kết con, xem tiến độ, thông báo
import prisma from '../config/db.js';
import {
  listNotifications,
  markNotificationRead,
} from '../services/parent/alertService.js';
import {
  assertParentOfStudent,
  generateLinkCode,
  listChildren,
  redeemLinkCode,
} from '../services/parent/linkService.js';
import { getStudentProgress } from '../services/progress/progressService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

/** [HS] Sinh mã liên kết cho phụ huynh. */
export const createLinkCode = handle(async (req, res) => {
  const code = await generateLinkCode({ studentId: req.user.id });
  return res.status(201).json({ code: code.code, expiresAt: code.expiresAt });
});

/** [PH] Nhập mã để liên kết với con. */
export const linkChild = handle(async (req, res) => {
  const child = await redeemLinkCode({ parentId: req.user.id, code: req.body.code });
  return res.status(201).json({ child });
});

export const children = handle(async (req, res) =>
  res.json({ children: await listChildren({ parentId: req.user.id }) }),
);

/** [PH] Tiến độ của con ở MỌI lớp con đang học, dùng lại đúng getStudentProgress. */
export const childProgress = handle(async (req, res) => {
  const { studentId } = req.params;
  await assertParentOfStudent({ parentId: req.user.id, studentId });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { class: { select: { id: true, name: true, subject: true } } },
  });
  const classes = await Promise.all(
    enrollments.map(async ({ class: cls }) => ({
      class: cls,
      progress: await getStudentProgress({ studentId, classId: cls.id }),
    })),
  );
  return res.json({ classes });
});

export const notifications = handle(async (req, res) =>
  res.json({
    notifications: await listNotifications({
      userId: req.user.id,
      unreadOnly: req.query.unread === 'true',
    }),
  }),
);

export const readNotification = handle(async (req, res) =>
  res.json({
    notification: await markNotificationRead({
      userId: req.user.id,
      notificationId: req.params.notificationId,
    }),
  }),
);