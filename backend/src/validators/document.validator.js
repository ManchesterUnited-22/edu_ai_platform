// Schema zod cho tài liệu
import { z } from 'zod';

/** Giáo viên sửa nội dung một đoạn (chunk) khi xem lại trước khi xuất bản. */
export const updateChunkSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});