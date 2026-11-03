import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const classSelect = {
  id: true,
  name: true,
  subject: true,
  teacherId: true,
  createdAt: true,
  teacher: { select: { id: true, fullName: true, email: true } },
  _count: { select: { enrollments: true } },
};

const findClassForUser = async (classId, user) => {
  const found = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      ...classSelect,
      enrollments: {
        where: { studentId: user.id },
        select: { id: true, joinedAt: true },
      },
    },
  });

  if (!found) {
    throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
  }

  const canAccess =
    user.role === 'teacher'
      ? found.teacherId === user.id
      : found.enrollments.length > 0;

  if (!canAccess) {
    throw new AppError('Bạn không có quyền truy cập lớp học này', 403, 'FORBIDDEN');
  }

  return found;
};

export const createClass = async (req, res, next) => {
  try {
    const created = await prisma.class.create({
      data: { ...req.body, teacherId: req.user.id },
      select: classSelect,
    });

    return res.status(201).json({ class: created });
  } catch (error) {
    return next(error);
  }
};

export const listClasses = async (req, res, next) => {
  try {
    const where =
      req.user.role === 'teacher'
        ? { teacherId: req.user.id }
        : { enrollments: { some: { studentId: req.user.id } } };

    const classes = await prisma.class.findMany({
      where,
      select: classSelect,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ classes });
  } catch (error) {
    return next(error);
  }
};

export const getClass = async (req, res, next) => {
  try {
    const found = await findClassForUser(req.params.classId, req.user);
    return res.json({ class: found });
  } catch (error) {
    return next(error);
  }
};

export const enrollStudent = async (req, res, next) => {
  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.classId },
      select: { id: true, teacherId: true },
    });

    if (!classRecord) {
      throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
    }

    if (classRecord.teacherId !== req.user.id) {
      throw new AppError('Chỉ giáo viên của lớp mới có thể ghi danh', 403, 'FORBIDDEN');
    }

    const student = await prisma.user.findUnique({
      where: { id: req.body.studentId },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'student') {
      throw new AppError('Học sinh không hợp lệ', 404, 'STUDENT_NOT_FOUND');
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        classId: classRecord.id,
        studentId: student.id,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({ enrollment });
  } catch (error) {
    return next(error);
  }
};

export const removeStudent = async (req, res, next) => {
  try {
    const classRecord = await prisma.class.findUnique({
      where: { id: req.params.classId },
      select: { teacherId: true },
    });

    if (!classRecord) {
      throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
    }

    if (classRecord.teacherId !== req.user.id) {
      throw new AppError(
        'Chỉ giáo viên của lớp mới có thể xóa ghi danh',
        403,
        'FORBIDDEN',
      );
    }

    const deleted = await prisma.enrollment.deleteMany({
      where: {
        classId: req.params.classId,
        studentId: req.params.studentId,
      },
    });

    if (deleted.count === 0) {
      throw new AppError(
        'Học sinh chưa tham gia lớp',
        404,
        'ENROLLMENT_NOT_FOUND',
      );
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
