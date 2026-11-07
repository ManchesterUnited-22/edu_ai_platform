import { chunkText, chunkPages } from '../../src/services/rag/chunker.js';

const sample =
  'Quang hợp là quá trình cây xanh tạo ra chất hữu cơ. ' +
  'Quá trình này diễn ra ở lá cây. ' +
  'Nguyên liệu gồm nước và khí cacbonic. ' +
  'Sản phẩm là đường glucozơ và khí oxi. ' +
  'Ánh sáng mặt trời cung cấp năng lượng cho phản ứng.';

describe('chunkText', () => {
  test('văn bản rỗng -> không có chunk', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  test('văn bản ngắn -> đúng 1 chunk', () => {
    expect(chunkText(sample, { chunkSize: 800, overlap: 100 })).toHaveLength(1);
  });

  test('không chunk nào vượt chunkSize', () => {
    const chunks = chunkText(sample, { chunkSize: 100, overlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(100));
  });

  test('không cắt ngang câu: mọi chunk kết thúc bằng dấu chấm', () => {
    const chunks = chunkText(sample, { chunkSize: 100, overlap: 30 });
    chunks.forEach((c) => expect(c.endsWith('.')).toBe(true));
  });

  test('có overlap: chunk sau lặp lại câu cuối của chunk trước', () => {
    const chunks = chunkText(sample, { chunkSize: 100, overlap: 60 });
    const lastSentence = chunks[0].split('. ').pop();
    expect(chunks[1].includes(lastSentence.replace(/\.$/, ''))).toBe(true);
  });

  test('câu quá dài vẫn bị cắt theo từ, không vượt chunkSize', () => {
    const long = Array(80).fill('từ').join(' ');
    const chunks = chunkText(long, { chunkSize: 50, overlap: 10 });
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(50));
  });

  test('đầu mục "1." không tách thành câu riêng', () => {
    const chunks = chunkText('1. Khái niệm quang hợp. 2. Điều kiện xảy ra.', {
      chunkSize: 800,
      overlap: 0,
    });
    expect(chunks[0]).toContain('1. Khái niệm');
  });
});

describe('chunkPages', () => {
  test('giữ số trang và đánh chunkIndex liên tục', () => {
    const result = chunkPages(
      [
        { pageNumber: 1, text: 'Trang một có nội dung.' },
        { pageNumber: 2, text: 'Trang hai có nội dung khác.' },
      ],
      { chunkSize: 800, overlap: 0 },
    );
    expect(result.map((c) => c.pageNumber)).toEqual([1, 2]);
    expect(result.map((c) => c.chunkIndex)).toEqual([0, 1]);
  });
});