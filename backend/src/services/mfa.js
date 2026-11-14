import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { generateSecret, generateURI, verify } from 'otplib';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';

const algorithm = 'aes-256-gcm';
const encryptionKey = crypto.createHash('sha256').update(env.MFA_ENCRYPTION_KEY).digest();

export const encryptMfaSecret = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.');
};

export const decryptMfaSecret = (value) => {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  const decipher = crypto.createDecipheriv(
    algorithm,
    encryptionKey,
    Buffer.from(ivValue, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

export const createMfaSetup = async (email) => {
  const secret = generateSecret();
  const otpauthUrl = generateURI({ label: email, issuer: 'Học tập AI', secret });
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl),
  };
};

export const verifyMfaCode = async (code, secret) => {
  const normalized = code.replace(/\s+/g, '');
  const result = await verify({ token: normalized, secret });
  return result.valid;
};

export const createRecoveryCodes = async () => {
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
  return {
    codes,
    hashes: await Promise.all(codes.map((code) => hashPassword(code))),
  };
};

export const findRecoveryCodeIndex = async (code, hashes) => {
  for (let index = 0; index < hashes.length; index += 1) {
    if (await verifyPassword(code.replace(/\s+/g, '').toUpperCase(), hashes[index])) return index;
  }
  return -1;
};
