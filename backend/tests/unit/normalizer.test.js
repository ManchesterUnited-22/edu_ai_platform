import { normalizeText } from '../../src/utils/text.js';
import { normalizePages } from '../../src/services/ingestion/normalizer.js';

describe('normalizeText', () => {
  test('đưa dấu tiếng Việt dạng tổ hợp về NFC', () => {
    const decomposed = 'Quang ho\u031B\u0323p'; // "hợp" viết kiểu tổ hợp (o + móc + chấm dưới)
    expect(decomposed).not.toBe(decomposed.normalize('NFC'));
    expect(normalizeText(decomposed)).toBe('Quang h\u1EE3p'); // "hợp" dạng dựng sẵn
  });

  test('nối dòng bị ngắt giữa câu, giữ ranh giới đoạn', () => {
    expect(normalizeText('Cây xanh hấp thụ\nánh sáng.\n\nĐoạn hai.')).toBe(
      'Cây xanh hấp thụ ánh sáng.\n\nĐoạn hai.',
    );
  });

  test('bỏ ký tự điều khiển và khoảng trắng thừa', () => {
    expect(normalizeText('a\u0000b   c\u200Bd')).toBe('ab cd');
  });

  test('rỗng/null -> chuỗi rỗng', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText('  \n ')).toBe('');
  });
});

describe('normalizePages', () => {
  test('bỏ trang trống và giữ số trang', () => {
    const out = normalizePages([
      { pageNumber: 1, text: 'Nội dung' },
      { pageNumber: 2, text: '  \n ' },
      { pageNumber: 3, text: 'Tiếp' },
    ]);
    expect(out.map((p) => p.pageNumber)).toEqual([1, 3]);
  });
});