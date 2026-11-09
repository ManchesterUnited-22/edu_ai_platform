// Sinh/xác thực mã liên kết có hạn, dùng một lần
import { randomInt } from 'node:crypto';
import defaultPrisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho dễ đọc
const CODE_LENGTH = 8; // 32^8 ≈ 1,1 nghìn tỉ tổ hợp

const clock = (deps) => (deps.now ?? (() => new Date()))();
const randomCode = () =>
  Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export const normalizeCode = (raw) => String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');

/** Học sinh sinh mã. Mỗi học sinh chỉ có MỘT mã còn hiệu lực: sinh mã mới thì mã cũ hết hạn ngay. */
export async function generateLinkCode({ studentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const ttlMinutes = deps.ttlMinutes ?? env.LINK_CODE_TTL_MINUTES;
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

  await prisma.linkCode.updateMany({
    where: { studentId, usedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.linkCode.create({
        data: { code: (deps.randomCode ?? randomCode)(), studentId, expiresAt },
        select: { code: true, expiresAt: true },
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error; // trùng mã (cực hiếm) thì sinh lại
    }
  }
  throw new AppError('Không tạo được mã, hãy thử lại', 500, 'LINK_CODE_FAILED');
}

/**
 * Phụ huynh nhập mã. updateMany có điều kiện là thao tác nguyên tử:
 * hai người nhập cùng lúc thì chỉ một người thành công.
 * Thông báo lỗi chung chung để không lộ mã nào tồn tại.
 */
export async function redeemLinkCode({ parentId, code }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const normalized = normalizeCode(code);

  const { count } = await prisma.linkCode.updateMany({
    where: { code: normalized, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now, usedById: parentId },
  });
  if (count === 0) {
    throw new AppError('Mã không đúng, đã hết hạn hoặc đã được dùng', 400, 'INVALID_LINK_CODE');
  }

  const row = await prisma.linkCode.findUnique({
    where: { code: normalized },
    select: { studentId: true, student: { select: { id: true, fullName: true } } },
  });
  await prisma.parentLink.upsert({
    where: { parentId_studentId: { parentId, studentId: row.studentId } },
    update: {},
    create: { parentId, studentId: row.studentId },
  });
  return row.student;
}

export async function listChildren({ parentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const links = await prisma.parentLink.findMany({
    where: { parentId },
    orderBy: { createdAt: 'asc' },
    select: { student: { select: { id: true, fullName: true, email: true } } },
  });
  return links.map((l) => l.student);
}

/** Phụ huynh chỉ xem được con đã liên kết; không thì coi như không tồn tại. */
export async function assertParentOfStudent({ parentId, studentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const link = await prisma.parentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { id: true },
  });
  if (!link) throw new AppError('Không tìm thấy học sinh', 404, 'CHILD_NOT_FOUND');
}