// Dựng prompt chỉ dựa trên ngữ cảnh truy xuất
import fs from 'node:fs';
import { NO_DOC_MESSAGE } from './confidence.js';

const SYSTEM_PROMPT = fs
  .readFileSync(new URL('../../prompts/ragAnswer.txt', import.meta.url), 'utf8')
  .replace('{{NO_DOC_MESSAGE}}', NO_DOC_MESSAGE)
  .trim();

// Không cho nội dung tài liệu / câu hỏi tự đóng thẻ để thoát khỏi vùng "dữ liệu"
const neutralizeTags = (text) => text.replace(/<\/?\s*(tai_lieu|cau_hoi)\s*>/gi, '');

/**
 * @param {string} question
 * @param {{text:string, fileName:string, pageNumber:number|null}[]} evidence
 * @returns {{system:string, user:string}}
 */
export function buildAnswerPrompt(question, evidence) {
  const sources = evidence
    .map((e, i) => {
      const where = e.pageNumber ? `${e.fileName}, trang ${e.pageNumber}` : e.fileName;
      return `[${i + 1}] (${neutralizeTags(where)})\n${neutralizeTags(e.text)}`;
    })
    .join('\n\n');

  return {
    system: SYSTEM_PROMPT,
    user: `<tai_lieu>\n${sources}\n</tai_lieu>\n\n<cau_hoi>\n${neutralizeTags(question)}\n</cau_hoi>`,
  };
}