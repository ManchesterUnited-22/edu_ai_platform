// Kiểm tra quyền truy cập lớp TRƯỚC khi xử lý tiếp (ví dụ trước khi nhận file upload)
import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';

/** Giáo viên phải là chủ lớp. Gắn lớp vào req.classRecord. */
export const requireOwnedClass = async (req, res, next) => {
  try {
    const found = await prisma.class.findUnique({ where: { id: req.params.classId } });
    if (!found) throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');
    if (found.teacherId !== req.user.id) {
      throw new AppError('Bạn không phải giáo viên của lớp này', 403, 'FORBIDDEN');
    }
    req.classRecord = found;
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Giáo viên của lớp hoặc học sinh đã ghi danh. Gắn lớp vào req.classRecord. */
export const requireClassMember = async (req, res, next) => {
  try {
    const found = await prisma.class.findUnique({
      where: { id: req.params.classId },
      include: { enrollments: { where: { studentId: req.user.id }, select: { id: true } } },
    });
    if (!found) throw new AppError('Không tìm thấy lớp học', 404, 'CLASS_NOT_FOUND');

    const allowed =
      req.user.role === 'teacher'
        ? found.teacherId === req.user.id
        : req.user.role === 'student' && found.enrollments.length > 0;
    if (!allowed) {
      throw new AppError('Bạn không có quyền truy cập lớp học này', 403, 'FORBIDDEN');
    }
    req.classRecord = found;
    return next();
  } catch (error) {
    return next(error);
  }
};