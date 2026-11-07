// Chunking: chia theo câu/đoạn, không cắt ngang ý; có overlap
import { env } from '../../config/env.js';

// Tách ở cuối câu (. ! ? …) theo sau là khoảng trắng, hoặc ở dòng trống (hết đoạn)
const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+|\n{2,}/;
// Số thứ tự đầu mục kiểu "1." / "2)" không phải một câu riêng
const LIST_MARKER = /^\d+[.)]$/;

function splitSentences(text) {
  const raw = text
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const merged = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (LIST_MARKER.test(raw[i]) && i + 1 < raw.length) {
      raw[i + 1] = `${raw[i]} ${raw[i + 1]}`;
    } else {
      merged.push(raw[i]);
    }
  }
  return merged;
}

// Câu dài hơn chunkSize: bắt buộc cắt, nhưng cắt theo từ chứ không cắt giữa từ
function splitLongSentence(sentence, chunkSize) {
  const parts = [];
  let current = '';
  for (const word of sentence.split(' ')) {
    if (current && current.length + 1 + word.length > chunkSize) {
      parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Chia một đoạn văn bản thành các chunk (mảng string).
 * Mỗi chunk gồm các câu nguyên vẹn, dài tối đa ~chunkSize ký tự;
 * chunk sau lặp lại vài câu cuối của chunk trước (tối đa `overlap` ký tự).
 */
export function chunkText(
  text,
  { chunkSize = env.CHUNK_SIZE, overlap = env.CHUNK_OVERLAP } = {},
) {
  if (!text || !text.trim()) return [];

  const units = splitSentences(text).flatMap((s) =>
    s.length > chunkSize ? splitLongSentence(s, chunkSize) : [s],
  );

  const chunks = [];
  let current = [];
  let hasNew = false; // current có câu mới ngoài phần overlap không

  for (const unit of units) {
    const currentLen = current.join(' ').length;
    if (current.length && currentLen + 1 + unit.length > chunkSize) {
      chunks.push(current.join(' '));

      // Lấy các câu cuối làm overlap
      const carry = [];
      let carryLen = 0;
      for (let i = current.length - 1; i >= 0; i -= 1) {
        const added = current[i].length + (carry.length ? 1 : 0);
        if (carryLen + added > overlap) break;
        carry.unshift(current[i]);
        carryLen += added;
      }
      // Overlap + câu mới mà vượt chunkSize thì bỏ bớt overlap
      while (carry.length && carry.join(' ').length + 1 + unit.length > chunkSize) {
        carry.shift();
      }
      current = carry;
      hasNew = false;
    }
    current.push(unit);
    hasNew = true;
  }

  if (current.length && hasNew) chunks.push(current.join(' '));
  return chunks;
}

/**
 * Chunk theo từng trang để giữ số trang phục vụ trích dẫn.
 * @param {{pageNumber:number|null, text:string}[]} pages
 * @returns {{chunkIndex:number, text:string, pageNumber:number|null}[]}
 */
export function chunkPages(pages, options) {
  const result = [];
  for (const page of pages) {
    for (const text of chunkText(page.text, options)) {
      result.push({
        chunkIndex: result.length,
        text,
        pageNumber: page.pageNumber ?? null,
      });
    }
  }
  return result;
}