import { describe, it, expect } from 'vitest';
import { generateSecurePassword, generateNtfyTopic } from './cryptoUtils';
import { getFriendlyErrorMessage } from './errorUtils';

describe('M4 Security and Crypto Utilities', () => {
  it('generates secure passwords with at least 12 characters and high entropy', () => {
    const pwd1 = generateSecurePassword();
    expect(pwd1.length).toBeGreaterThanOrEqual(12);

    const pwd2 = generateSecurePassword(16);
    expect(pwd2.length).toBe(16);

    const pwd3 = generateSecurePassword(8); // Enforces minimum 12 chars
    expect(pwd3.length).toBe(12);

    expect(pwd1).not.toBe(pwd2);
  });

  it('generates ntfy topics matching wm- prefix followed by 16 lowercase alphanumeric characters', () => {
    const topic = generateNtfyTopic();
    expect(topic.startsWith('wm-')).toBe(true);
    expect(topic.length).toBe(19); // 'wm-' (3) + 16 chars = 19
    expect(/^wm-[a-z0-9]{16}$/.test(topic)).toBe(true);

    const topic2 = generateNtfyTopic();
    expect(topic).not.toBe(topic2);
  });

  it('formats Firebase errors to friendly plain-English messages', () => {
    expect(getFriendlyErrorMessage(new Error('Firebase: Error (auth/email-already-in-use).')))
      .toBe('This email address is already in use by an existing account.');

    expect(getFriendlyErrorMessage(new Error('Firebase: Error (auth/weak-password).')))
      .toBe('Password is too weak. Please use at least 8 characters (or 12+ characters for generated credentials).');

    expect(getFriendlyErrorMessage(new Error('Firebase: Error (auth/invalid-email).')))
      .toBe('Please enter a valid email address.');

    expect(getFriendlyErrorMessage(new Error('PERMISSION_DENIED: Client doesn\'t have permission to access the desired data.')))
      .toBe('Permission denied by system security rules.');

    expect(getFriendlyErrorMessage(new Error('Unknown custom error.')))
      .toBe('Unknown custom error.');
  });
});
