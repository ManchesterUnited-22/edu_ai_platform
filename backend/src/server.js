import app from './app.js';
import { env } from './config/env.js';
import { recoverPendingDocuments } from './jobs/documentQueue.js';
import { startAlertCron } from './jobs/alertCron.js';
app.listen(env.PORT, () => {
  console.log(`API chạy tại http://localhost:${env.PORT}`);
  startAlertCron();
  recoverPendingDocuments()
    .then((n) => n > 0 && console.log(`Đưa ${n} tài liệu dở dang vào hàng đợi xử lý lại`))
    .catch((error) => console.error('Không khôi phục được hàng đợi tài liệu:', error.message));
});