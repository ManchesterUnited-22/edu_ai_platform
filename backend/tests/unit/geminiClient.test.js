import { jest } from '@jest/globals';

process.env.GEMINI_API_KEY = 'test-key';
const { generateText } = await import('../../src/services/generation/geminiClient.js');

const ok = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
});
const noSleep = { sleep: async () => {} };

afterEach(() => {
  delete globalThis.fetch;
});

describe('generateText', () => {
  test('gửi system instruction + prompt, trả về text', async () => {
    globalThis.fetch = jest.fn(async () => ok('Xin chào'));
    const text = await generateText({ system: 'SYS', prompt: 'hỏi' }, noSleep);
    expect(text).toBe('Xin chào');

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toContain(':generateContent');
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe('SYS');
    expect(body.contents[0].parts[0].text).toBe('hỏi');
    expect(body.generationConfig.temperature).toBe(0.2);
  });

  test('lỗi 503 thì thử lại rồi thành công', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'busy' })
      .mockResolvedValueOnce(ok('xong'));
    expect(await generateText({ prompt: 'x' }, noSleep)).toBe('xong');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test('lỗi 400 không thử lại', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 400, text: async () => 'bad' }));
    await expect(generateText({ prompt: 'x' }, noSleep)).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('mạng/timeout lỗi liên tục -> GENERATION_FAILED sau 3 lần', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('timeout');
    });
    await expect(generateText({ prompt: 'x' }, noSleep)).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  test('bị chặn/không có nội dung -> GENERATION_BLOCKED', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
    }));
    await expect(generateText({ prompt: 'x' }, noSleep)).rejects.toMatchObject({ code: 'GENERATION_BLOCKED' });
  });
});