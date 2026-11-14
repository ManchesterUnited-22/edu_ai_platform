import { jest } from '@jest/globals';

process.env.GEMINI_API_KEY = 'test-key';
const { reviewTeacherProfile } = await import('../../src/services/teacherVerification.js');

const response = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
});

afterEach(() => {
  delete globalThis.fetch;
});

describe('teacherVerification', () => {
  test('uses Gemini recommendation when structured output is valid', async () => {
    globalThis.fetch = jest.fn(async () => response(JSON.stringify({
      riskScore: 12,
      label: 'low',
      recommendedLevel: 'verified',
      reasons: ['Hồ sơ có đủ thông tin giảng dạy'],
    })));

    await expect(reviewTeacherProfile({
      teacherType: 'independent',
      teacherSubjects: 'Toán',
      teacherBio: 'Gia sư luyện thi',
      teacherExperienceYears: 5,
      verificationLevel: 'basic',
    })).resolves.toMatchObject({ source: 'gemini', riskScore: 12, recommendedLevel: 'verified' });
  });

  test('falls back to rules when Gemini is unavailable', async () => {
    globalThis.fetch = jest.fn(async () => { throw new Error('offline'); });

    await expect(reviewTeacherProfile({
      teacherType: 'online',
      verificationLevel: 'basic',
    })).resolves.toMatchObject({ source: 'rules', recommendedLevel: 'basic' });
  });
});
