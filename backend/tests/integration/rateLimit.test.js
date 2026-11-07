import express from 'express';
import request from 'supertest';

process.env.QA_PER_MINUTE = '2';
const { qaRateLimiter } = await import('../../src/middlewares/rateLimit.js');
const { errorHandler } = await import('../../src/middlewares/errorHandler.js');

const app = express();
app.post('/ask', (req, res, next) => {
  req.user = { id: req.get('x-user') };
  next();
}, qaRateLimiter, (req, res) => res.json({ ok: true }));
app.use(errorHandler);

describe('qaRateLimiter', () => {
  test('quá giới hạn thì 429, và tính riêng từng người dùng', async () => {
    const asA = () => request(app).post('/ask').set('x-user', 'A');
    expect((await asA()).status).toBe(200);
    expect((await asA()).status).toBe(200);

    const blocked = await asA();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    // người dùng khác không bị ảnh hưởng
    expect((await request(app).post('/ask').set('x-user', 'B')).status).toBe(200);
  });
});