import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signAccessToken } from '../utils/jwt.js';
import { signMfaToken, verifyMfaToken } from '../utils/jwt.js';
import { reviewTeacherProfile } from '../services/teacherVerification.js';
import {
  createMfaSetup,
  createRecoveryCodes,
  decryptMfaSecret,
  encryptMfaSecret,
  findRecoveryCodeIndex,
  verifyMfaCode,
} from '../services/mfa.js';

export const publicUser = ({
  id, email, fullName, role, status, teacherType, verificationLevel,
  teacherBio, teacherSubjects, teacherExperienceYears, createdAt,
  mfaEnabled,
}) => ({
  id,
  email,
  fullName,
  role,
  status,
  teacherType,
  verificationLevel,
  teacherBio,
  teacherSubjects,
  teacherExperienceYears,
  mfaEnabled,
  createdAt,
});

const requestContext = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent')?.slice(0, 500),
});

const recordSecurityEvent = async (data) => {
  try {
    await prisma.securityEvent.create({ data });
  } catch (error) {
    console.error('Không thể ghi nhận sự kiện bảo mật', error);
  }
};

export const register = async (req, res, next) => {
  try {
    const {
      email, password, fullName, role = 'student', teacherType, inviteCode,
      teacherBio, teacherSubjects, teacherExperienceYears,
    } = req.body;

    // Nếu đặt TEACHER_INVITE_CODE trong .env thì đăng ký giáo viên phải nhập đúng mã
    const teacherCode = process.env.TEACHER_INVITE_CODE;
    if (role === 'teacher' && teacherCode && inviteCode !== teacherCode) {
      throw new AppError('Mã giáo viên không đúng', 403, 'INVALID_INVITE_CODE');
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const verifiedTeacher = role === 'teacher' && teacherCode && inviteCode === teacherCode;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        fullName,
        role,
        status: 'active',
        teacherType: role === 'teacher' ? teacherType : null,
        verificationLevel: verifiedTeacher ? 'verified' : 'basic',
        teacherBio: role === 'teacher' ? teacherBio : null,
        teacherSubjects: role === 'teacher' ? teacherSubjects : null,
        teacherExperienceYears: role === 'teacher' ? teacherExperienceYears : null,
      },
    });

    if (role === 'teacher') {
      void reviewTeacherProfile(user).then((review) => prisma.securityEvent.create({
        data: {
          type: 'teacher_ai_review',
          targetUserId: user.id,
          riskScore: review.riskScore,
          riskReasons: review.reasons,
          metadata: {
            source: review.source,
            label: review.label,
            recommendedLevel: review.recommendedLevel,
            fallbackReason: review.fallbackReason ?? null,
          },
        },
      })).catch((error) => {
        console.error('Không thể lưu kết quả phân tích hồ sơ giáo viên:', error);
      });
    }

    return res.status(201).json({
      user: publicUser(user),
      ...(role === 'teacher'
        ? { mfaSetupRequired: true, mfaToken: signMfaToken(user, 'setup') }
        : { accessToken: signAccessToken(user) }),
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    const passwordMatches = user && await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      if (user?.role === 'teacher') {
        const since = new Date(Date.now() - 15 * 60 * 1000);
        const attempts = await prisma.securityEvent.count({
          where: { type: 'failed_teacher_login', targetUserId: user.id, createdAt: { gte: since } },
        });
        await recordSecurityEvent({
          type: 'failed_teacher_login',
          targetUserId: user.id,
          emailHint: email,
          ...requestContext(req),
          riskScore: attempts >= 4 ? Math.min(100, 50 + attempts * 10) : 0,
          riskReasons: attempts >= 4
            ? [`Có ${attempts + 1} lần đăng nhập sai trong 15 phút`]
            : ['Lần thử sai; chưa đủ ngưỡng cảnh báo'],
          metadata: { attempts: attempts + 1, windowMinutes: 15, alert: attempts >= 4 },
        });
      }
      throw new AppError(
        'Email hoặc mật khẩu không đúng',
        401,
        'INVALID_CREDENTIALS',
      );
    }

    if (user.status === 'pending') {
      if (user.role === 'teacher') {
        await recordSecurityEvent({
          type: 'pending_teacher_access',
          targetUserId: user.id,
          ...requestContext(req),
          riskScore: 45,
          riskReasons: ['Tài khoản giáo viên chưa được admin duyệt'],
        });
      }
      throw new AppError(
        'Tài khoản giáo viên đang chờ admin duyệt',
        403,
        'TEACHER_PENDING_APPROVAL',
      );
    }
    if (user.status !== 'active') {
      throw new AppError('Tài khoản chưa được phép đăng nhập', 403, 'ACCOUNT_NOT_ACTIVE');
    }

    if (user.role === 'teacher') {
      return res.json({
        user: publicUser(user),
        ...(user.mfaEnabled
          ? { mfaRequired: true, mfaToken: signMfaToken(user, 'login') }
          : { mfaSetupRequired: true, mfaToken: signMfaToken(user, 'setup') }),
      });
    }

    return res.json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const me = (req, res) => res.json({ user: publicUser(req.user) });

const userFromMfaToken = async (token, purpose) => {
  let payload;
  try {
    payload = verifyMfaToken(token, purpose);
  } catch {
    throw new AppError('Phiên xác thực hai bước không hợp lệ hoặc đã hết hạn', 401, 'INVALID_MFA_TOKEN');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.role !== 'teacher' || user.status !== 'active') {
    throw new AppError('Tài khoản không thể xác thực MFA', 403, 'MFA_ACCOUNT_NOT_ALLOWED');
  }
  return user;
};

export const setupMfa = async (req, res, next) => {
  try {
    const user = await userFromMfaToken(req.body.mfaToken, 'setup');
    const setup = await createMfaSetup(user.email);
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaPendingSecret: encryptMfaSecret(setup.secret) },
    });
    return res.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      otpauthUrl: setup.otpauthUrl,
      secret: setup.secret,
    });
  } catch (error) {
    return next(error);
  }
};

export const confirmMfaSetup = async (req, res, next) => {
  try {
    const user = await userFromMfaToken(req.body.mfaToken, 'setup');
    if (user.mfaEnabled || !user.mfaPendingSecret) {
      throw new AppError('MFA đã được thiết lập hoặc chưa bắt đầu thiết lập', 409, 'MFA_SETUP_STATE_INVALID');
    }
    const secret = decryptMfaSecret(user.mfaPendingSecret);
    if (!(await verifyMfaCode(req.body.code, secret))) {
      throw new AppError('Mã xác thực không đúng', 400, 'INVALID_MFA_CODE');
    }
    const recovery = await createRecoveryCodes();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptMfaSecret(secret),
        mfaPendingSecret: null,
        mfaRecoveryCodes: recovery.hashes,
        mfaEnrolledAt: new Date(),
      },
    });
    return res.json({
      user: publicUser(updated),
      accessToken: signAccessToken(updated),
      recoveryCodes: recovery.codes,
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyMfaLogin = async (req, res, next) => {
  try {
    const user = await userFromMfaToken(req.body.mfaToken, 'login');
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new AppError('MFA chưa được thiết lập cho tài khoản', 409, 'MFA_NOT_CONFIGURED');
    }
    const code = req.body.code.replace(/\s+/g, '');
    const secret = decryptMfaSecret(user.mfaSecret);
    let valid = await verifyMfaCode(code, secret);
    let recoveryCodes = Array.isArray(user.mfaRecoveryCodes) ? [...user.mfaRecoveryCodes] : [];
    if (!valid) {
      const recoveryIndex = await findRecoveryCodeIndex(code, recoveryCodes);
      valid = recoveryIndex >= 0;
      if (valid) recoveryCodes.splice(recoveryIndex, 1);
    }
    if (!valid) throw new AppError('Mã xác thực không đúng', 401, 'INVALID_MFA_CODE');

    const updated = recoveryCodes.length !== (Array.isArray(user.mfaRecoveryCodes) ? user.mfaRecoveryCodes.length : 0)
      ? await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: recoveryCodes } })
      : user;
    return res.json({ user: publicUser(updated), accessToken: signAccessToken(updated) });
  } catch (error) {
    return next(error);
  }
};
