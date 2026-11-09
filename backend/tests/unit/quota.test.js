import { nextResetVN, startOfDayVN } from '../../src/utils/quota.js';

describe('quota theo ngày giờ Việt Nam', () => {
  test('23:30 UTC (= 06:30 sáng hôm sau ở VN) thuộc ngày VN mới', () => {
    // 2026-11-10 23:30 UTC = 2026-11-11 06:30 giờ VN -> ngày VN bắt đầu 2026-11-10 17:00 UTC
    const start = startOfDayVN(new Date('2026-11-10T23:30:00Z'));
    expect(start.toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });

  test('10:00 UTC (= 17:00 VN) cùng ngày VN với 01:00 UTC', () => {
    const a = startOfDayVN(new Date('2026-11-10T01:00:00Z'));
    const b = startOfDayVN(new Date('2026-11-10T10:00:00Z'));
    expect(a.toISOString()).toBe(b.toISOString());
    expect(a.toISOString()).toBe('2026-11-09T17:00:00.000Z');
  });

  test('đúng nửa đêm giờ VN là ranh giới giữa hai ngày', () => {
    const before = startOfDayVN(new Date('2026-11-10T16:59:59Z'));
    const after = startOfDayVN(new Date('2026-11-10T17:00:00Z'));
    expect(after.getTime() - before.getTime()).toBe(24 * 3600 * 1000);
  });

  test('thời điểm làm mới hạn mức là 0 giờ VN hôm sau', () => {
    expect(nextResetVN(new Date('2026-11-10T01:00:00Z')).toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
});