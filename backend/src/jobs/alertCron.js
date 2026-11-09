// node-cron: quét cảnh báo phụ huynh định kỳ
import cron from 'node-cron';
import { env } from '../config/env.js';
import { runAlertScan } from '../services/parent/alertService.js';

let running = false;

/** Chạy một lượt quét; bỏ qua nếu lượt trước chưa xong. Không bao giờ ném lỗi ra ngoài. */
export async function runAlertJob() {
  if (running) return null;
  running = true;
  try {
    const result = await runAlertScan();
    console.log(
      `Quét cảnh báo: ${result.links} liên kết, tạo ${result.created} thông báo, lỗi ${result.failed}`,
    );
    return result;
  } catch (error) {
    console.error('Job cảnh báo lỗi:', error.message);
    return null;
  } finally {
    running = false;
  }
}

export function startAlertCron() {
  if (!env.ALERT_ENABLED) return null;
  if (!cron.validate(env.ALERT_CRON)) {
    console.error(`ALERT_CRON không hợp lệ: "${env.ALERT_CRON}", job cảnh báo không chạy`);
    return null;
  }
  return cron.schedule(env.ALERT_CRON, runAlertJob, { timezone: 'Asia/Ho_Chi_Minh' });
}