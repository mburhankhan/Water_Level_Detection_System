// Cryptographically secure generators using crypto.getRandomValues (never Math.random)

export function generateSecurePassword(length: number = 14): string {
  const minLength = Math.max(12, length);
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const values = new Uint8Array(minLength);
  crypto.getRandomValues(values);

  let result = '';
  for (let i = 0; i < minLength; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

export function generateNtfyTopic(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);

  let topicSuffix = '';
  for (let i = 0; i < 16; i++) {
    topicSuffix += chars[values[i] % chars.length];
  }
  return `wm-${topicSuffix}`;
}
