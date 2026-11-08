// Gom routes /api/v1
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import classRoutes from './class.routes.js';
import contentRoutes from './content.routes.js';
import documentRoutes from './document.routes.js';
import feedbackRoutes from './feedback.routes.js';
import qaRoutes from './qa.routes.js';
import quizRoutes from './quiz.routes.js';
import questionRoutes from './question.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/classes', classRoutes);
router.use('/', documentRoutes);
router.use('/', qaRoutes);
router.use('/', feedbackRoutes);
router.use('/', contentRoutes);
router.use('/', questionRoutes);
router.use('/', quizRoutes);

export default router;