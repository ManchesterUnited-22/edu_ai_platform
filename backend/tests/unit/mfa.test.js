import { generate } from 'otplib';
import {
  createMfaSetup,
  decryptMfaSecret,
  encryptMfaSecret,
  verifyMfaCode,
} from '../../src/services/mfa.js';

describe('mfa service', () => {
  test('creates an Authenticator setup and verifies its current code', async () => {
    const setup = await createMfaSetup('teacher@example.com');

    expect(setup.otpauthUrl).toContain('teacher%40example.com');
    expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(await verifyMfaCode(await generate({ secret: setup.secret }), setup.secret)).toBe(true);
  });

  test('encrypts the TOTP secret at rest', () => {
    const encrypted = encryptMfaSecret('secret-value');

    expect(encrypted).not.toContain('secret-value');
    expect(decryptMfaSecret(encrypted)).toBe('secret-value');
  });
});
