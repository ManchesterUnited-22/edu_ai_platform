import { hasEnoughEvidence } from '../../src/services/rag/confidence.js';

describe('hasEnoughEvidence', () => {
  test('đạt ngưỡng -> true', () => expect(hasEnoughEvidence(0.7, 0.65)).toBe(true));
  test('thấp hơn ngưỡng -> false', () => expect(hasEnoughEvidence(0.5, 0.65)).toBe(false));
  test('không có kết quả -> false', () => expect(hasEnoughEvidence(undefined, 0.65)).toBe(false));
});
