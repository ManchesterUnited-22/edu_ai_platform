import { jest } from '@jest/globals';

process.env.GEMINI_API_KEY = 'test-key';
const { generateJson } = await import('../../src/services/generation/geminiClient.js');

const reply = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
});
const schema = { type: 'OBJECT', properties: { a: { type: 'STRING' } } };

afterEach(() => {
  delete globalThis.fetch;
});

describe('generateJson', () => {
  test('ép Gemini trả JSON đúng schema và parse sẵn', async () => {
    globalThis.fetch = jest.fn(async () => reply('{"a":"xin chào"}'));
    expect(await generateJson({ prompt: 'x', schema })).toEqual({ a: 'xin chào' });

    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toEqual(schema);
  });

  test('tự bỏ hàng rào ```json nếu mô hình lỡ thêm vào', async () => {
    globalThis.fetch = jest.fn(async () => reply('```json\n{"a":"b"}\n```'));
    expect(await generateJson({ prompt: 'x', schema })).toEqual({ a: 'b' });
  });

  test('không phải JSON -> GENERATION_INVALID', async () => {
    globalThis.fetch = jest.fn(async () => reply('xin chào, đây không phải json'));
    await expect(generateJson({ prompt: 'x', schema })).rejects.toMatchObject({ code: 'GENERATION_INVALID' });
  });
});