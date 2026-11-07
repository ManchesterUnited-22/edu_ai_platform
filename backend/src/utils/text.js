// Xử lý văn bản tiếng Việt

/**
 * Làm sạch văn bản trích từ PDF/Word/OCR:
 *  - chuẩn hóa Unicode về NFC (PDF hay lưu dấu tiếng Việt dạng tổ hợp -> tìm kiếm/embedding bị lệch)
 *  - bỏ ký tự điều khiển, ký tự rộng 0
 *  - nối các dòng bị ngắt giữa câu, giữ nguyên ranh giới đoạn (dòng trống)
 */
export function normalizeText(input) {
  if (!input) return '';

  return input
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/-\n(?=\p{Ll})/gu, '') // từ bị gạch nối cuối dòng
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?<!\n)\n(?!\n)/g, ' ') // xuống dòng đơn trong đoạn -> khoảng trắng
    .trim();
}