import { normalizeText } from '../../utils/text.js';

/** Chuẩn hóa text của từng trang, bỏ trang trống. */
export function normalizePages(pages) {
  return pages
    .map((page) => ({ pageNumber: page.pageNumber ?? null, text: normalizeText(page.text) }))
    .filter((page) => page.text.length > 0);
}