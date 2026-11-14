import { Router } from 'express';
import {
  createVerification,
  getMyVerification,
  submitVerification,
  uploadVerificationDocument,
} from '../controllers/teacherVerification.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { uploadSingleFile } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { verificationSchema } from '../validators/auth.validator.js';

const router = Router();
router.use(authenticate, requireRole('teacher'));
router.get('/', getMyVerification);
router.post('/', validate(verificationSchema), createVerification);
router.post('/:verificationId/documents', uploadSingleFile, uploadVerificationDocument);
router.post('/:verificationId/submit', submitVerification);

export default router;
