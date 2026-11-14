// Đăng ký, đăng nhập, refresh token
import { Router } from 'express';
import {
  confirmMfaSetup,
  login,
  me,
  register,
  setupMfa,
  verifyMfaLogin,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  loginSchema,
  mfaCodeSchema,
  mfaTokenSchema,
  registerSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/mfa/setup', validate(mfaTokenSchema), setupMfa);
router.post('/mfa/confirm', validate(mfaCodeSchema), confirmMfaSetup);
router.post('/mfa/verify', validate(mfaCodeSchema), verifyMfaLogin);
router.get('/me', authenticate, me);

export default router;
