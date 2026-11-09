// Hạn mức theo ngày. "Ngày" tính theo giờ Việt Nam (UTC+7), không theo giờ máy chủ.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 00:00 giờ Việt Nam của ngày chứa `now`. */
export function startOfDayVN(now = new Date()) {
  const local = now.getTime() + VN_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - VN_OFFSET_MS);
}

/** Thời điểm hạn mức được làm mới (00:00 giờ Việt Nam hôm sau). */
export function nextResetVN(now = new Date()) {
  return new Date(startOfDayVN(now).getTime() + DAY_MS);
}