// Gom routes /api/v1
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import classRoutes from './class.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/classes', classRoutes);

export default router;
