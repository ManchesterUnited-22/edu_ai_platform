import mammoth from 'mammoth';

/** Word không có khái niệm trang cố định -> pageNumber = null. */
export async function extractDocx(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return [{ pageNumber: null, text: value }];
}