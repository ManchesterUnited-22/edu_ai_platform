// Khóa chat khi học sinh đang làm quiz chính thức (không được hỏi AI để tra đáp án)
import { hasActiveAttempt } from '../services/quiz/officialQuizService.js';
import { AppError } from '../utils/AppError.js';

/** `isLocked` có thể thay thế khi test. */
export const createChatLock = (isLocked = hasActiveAttempt) => async (req, res, next) => {
  try {
    if (req.user?.role === 'student' && (await isLocked(req.user.id))) {
      throw new AppError(
        'Bạn đang làm bài kiểm tra chính thức nên hỏi-đáp tạm thời bị khóa. Hãy nộp bài rồi quay lại.',
        423,
        'CHAT_LOCKED',
      );
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const chatLock = createChatLock();