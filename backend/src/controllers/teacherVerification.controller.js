import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { removeUploadedFile, resolveUploadPath } from '../utils/files.js';
import { reviewVerification } from '../services/teacherVerificationReview.js';

const documentKinds = new Set([
  'identity',
  'teaching_credential',
  'employment_proof',
  'transcript',
  'language_certificate',
  'other',
]);

const verificationSelect = {
  id: true,
  track: true,
  status: true,
  aiScore: true,
  aiLabel: true,
  aiReasons: true,
  aiSource: true,
  submittedAt: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  documents: {
    select: { id: true, kind: true, fileName: true, mimeType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
};

const loadOwnedVerification = async (id, userId) => {
  const verification = await prisma.teacherVerification.findFirst({
    where: { id, userId },
    include: { documents: true },
  });
  if (!verification) throw new AppError('Không tìm thấy hồ sơ xác minh', 404, 'VERIFICATION_NOT_FOUND');
  return verification;
};

export const getMyVerification = async (req, res, next) => {
  try {
    const verification = await prisma.teacherVerification.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: verificationSelect,
    });
    return res.json({ verification });
  } catch (error) {
    return next(error);
  }
};

export const createVerification = async (req, res, next) => {
  try {
    if (!req.user.mfaEnabled) {
      throw new AppError('Hãy bật MFA trước khi gửi hồ sơ xác minh', 403, 'MFA_REQUIRED_FOR_VERIFICATION');
    }
    const existing = await prisma.teacherVerification.findFirst({
      where: { userId: req.user.id, status: { in: ['draft', 'processing', 'admin_review'] } },
    });
    if (existing) {
      throw new AppError('Bạn đã có hồ sơ xác minh đang được xử lý', 409, 'VERIFICATION_IN_PROGRESS');
    }
    const verification = await prisma.teacherVerification.create({
      data: { userId: req.user.id, track: req.body.track },
      select: verificationSelect,
    });
    return res.status(201).json({ verification });
  } catch (error) {
    return next(error);
  }
};

export const uploadVerificationDocument = async (req, res, next) => {
  try {
    const verification = await loadOwnedVerification(req.params.verificationId, req.user.id);
    if (!['draft', 'needs_more_information'].includes(verification.status)) {
      throw new AppError('Hồ sơ hiện không nhận thêm giấy tờ', 409, 'VERIFICATION_NOT_EDITABLE');
    }
    if (!documentKinds.has(req.body.kind)) {
      throw new AppError('Loại giấy tờ không hợp lệ', 400, 'INVALID_VERIFICATION_DOCUMENT_KIND');
    }
    const document = await prisma.teacherVerificationDocument.create({
      data: {
        verificationId: verification.id,
        kind: req.body.kind,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        mimeType: req.file.mimetype,
      },
      select: { id: true, kind: true, fileName: true, mimeType: true, createdAt: true },
    });
    return res.status(201).json({ document });
  } catch (error) {
    if (req.file) await removeUploadedFile(req.file.filename).catch(() => {});
    return next(error);
  }
};

export const submitVerification = async (req, res, next) => {
  try {
    const verification = await loadOwnedVerification(req.params.verificationId, req.user.id);
    if (!['draft', 'needs_more_information'].includes(verification.status)) {
      throw new AppError('Hồ sơ không thể gửi ở trạng thái hiện tại', 409, 'VERIFICATION_NOT_SUBMITTABLE');
    }
    if (!verification.documents.some((document) => document.kind === 'identity')) {
      throw new AppError('Hồ sơ cần giấy tờ định danh', 400, 'IDENTITY_DOCUMENT_REQUIRED');
    }
    if (verification.documents.length < 2) {
      throw new AppError('Hồ sơ cần thêm ít nhất một giấy tờ chuyên môn', 400, 'PROFESSIONAL_DOCUMENT_REQUIRED');
    }

    await prisma.teacherVerification.update({
      where: { id: verification.id },
      data: { status: 'processing', submittedAt: new Date(), reviewNote: null },
    });
    let review;
    try {
      review = await reviewVerification(verification);
    } catch (error) {
      await prisma.teacherVerification.update({
        where: { id: verification.id },
        data: { status: 'needs_more_information', reviewNote: `Không thể đọc giấy tờ: ${error.message}`.slice(0, 500) },
      });
      throw error;
    }
    const status = review.missing.length ? 'needs_more_information' : 'admin_review';
    const updated = await prisma.teacherVerification.update({
      where: { id: verification.id },
      data: {
        status,
        aiScore: review.score,
        aiLabel: review.label,
        aiReasons: [...review.reasons, ...review.suspicious.map((item) => `Dấu hiệu cần kiểm tra: ${item}`)],
        aiSource: review.source,
      },
      select: verificationSelect,
    });
    return res.json({ verification: updated });
  } catch (error) {
    return next(error);
  }
};

export const viewVerificationDocument = async (req, res, next) => {
  try {
    const document = await prisma.teacherVerificationDocument.findFirst({
      where: {
        id: req.params.documentId,
        verificationId: req.params.verificationId,
      },
    });
    if (!document) throw new AppError('Không tìm thấy giấy tờ xác minh', 404, 'VERIFICATION_DOCUMENT_NOT_FOUND');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
    );
    return res.type(document.mimeType).sendFile(resolveUploadPath(document.filePath));
  } catch (error) {
    return next(error);
  }
};

export const listVerificationQueue = async (req, res, next) => {
  try {
    const verifications = await prisma.teacherVerification.findMany({
      where: { status: { in: ['admin_review', 'needs_more_information'] } },
      orderBy: { submittedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true, email: true, fullName: true, role: true, status: true,
            teacherType: true, verificationLevel: true, mfaEnabled: true, createdAt: true,
          },
        },
        documents: { select: { id: true, kind: true, fileName: true, mimeType: true, createdAt: true } },
      },
    });
    return res.json({ verifications });
  } catch (error) {
    return next(error);
  }
};

export const reviewVerificationByAdmin = async (req, res, next) => {
  try {
    const action = req.body.action;
    if (!['approve', 'reject', 'needs_more_information'].includes(action)) {
      throw new AppError('Hành động duyệt không hợp lệ', 400, 'INVALID_VERIFICATION_ACTION');
    }
    const verification = await prisma.teacherVerification.findUnique({
      where: { id: req.params.verificationId },
    });
    if (!verification) throw new AppError('Không tìm thấy hồ sơ xác minh', 404, 'VERIFICATION_NOT_FOUND');

    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_more_information';
    const updated = await prisma.$transaction(async (tx) => {
      const nextVerification = await tx.teacherVerification.update({
        where: { id: verification.id },
        data: { status, reviewerId: req.user.id, reviewedAt: new Date(), reviewNote: req.body.note?.trim() || null },
        select: verificationSelect,
      });
      if (action === 'approve') {
        await tx.user.update({
          where: { id: verification.userId },
          data: { verificationLevel: 'verified' },
        });
      }
      return nextVerification;
    });
    return res.json({ verification: updated });
  } catch (error) {
    return next(error);
  }
};
