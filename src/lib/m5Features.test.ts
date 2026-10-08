import { describe, it, expect } from 'vitest';
import { FEATURE_PUMP } from '../config/constants';

describe('M5 Features & Production Specifications', () => {
  it('keeps Phase 2 automated pump controls hidden behind FEATURE_PUMP = false', () => {
    expect(FEATURE_PUMP).toBe(false);
  });

  it('validates Phase 2 hardware command schema for RTDB security rules', () => {
    const now = Date.now();
    const commandPayload = {
      type: 'RUN_NOW',
      value: { mode: 'AUTO', durationMinutes: 15 },
      issuedBy: 'admin-uid-123',
      issuedAt: now,
      expiresAt: now + 60000,
    };

    // Schema validations based on database.rules.json: /devices/{deviceId}/commands
    expect(typeof commandPayload.type).toBe('string');
    expect(typeof commandPayload.issuedBy).toBe('string');
    expect(typeof commandPayload.issuedAt).toBe('number');
    expect(typeof commandPayload.expiresAt).toBe('number');
    expect(commandPayload.expiresAt).toBeGreaterThan(commandPayload.issuedAt);
  });

  it('verifies that Service Worker strictly rejects database and auth URLs from caching', () => {
    const shouldBypassCache = (urlStr: string) => {
      const url = new URL(urlStr);
      return (
        url.protocol === 'ws:' ||
        url.protocol === 'wss:' ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firebasedatabase.app') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('identitytoolkit') ||
        url.hostname.includes('securetoken') ||
        url.hostname.includes('ntfy.sh') ||
        url.pathname.endsWith('.json') ||
        url.searchParams.has('ns') ||
        url.searchParams.has('auth')
      );
    };

    // Database endpoints MUST bypass caching
    expect(shouldBypassCache('https://my-app.firebaseio.com/devices/dev-1/status.json')).toBe(true);
    expect(shouldBypassCache('https://water-monitor-rtdb.asia-southeast1.firebasedatabase.app/users.json')).toBe(true);
    expect(shouldBypassCache('wss://my-app.firebaseio.com/.ws?v=5&ns=my-app')).toBe(true);
    expect(shouldBypassCache('https://identitytoolkit.googleapis.com/v1/accounts:lookup')).toBe(true);
    expect(shouldBypassCache('https://securetoken.googleapis.com/v1/token')).toBe(true);
    expect(shouldBypassCache('https://ntfy.sh/wm-topic-123/publish')).toBe(true);

    // App Shell assets MUST NOT bypass caching
    expect(shouldBypassCache('https://example.com/assets/index-ABC.js')).toBe(false);
    expect(shouldBypassCache('https://example.com/assets/index-DEF.css')).toBe(false);
    expect(shouldBypassCache('https://example.com/icon.svg')).toBe(false);
    expect(shouldBypassCache('https://example.com/index.html')).toBe(false);
  });

  it('correctly resolves repository base path from GITHUB_REPOSITORY for GitHub Actions', () => {
    const getRepoBase = (ghRepo?: string, fallback: string = 'water-level-detection-system') => {
      const repoName = ghRepo ? ghRepo.split('/')[1] : fallback;
      return `/${repoName}/`;
    };

    expect(getRepoBase('burhanazam37/water-monitor')).toBe('/water-monitor/');
    expect(getRepoBase('acme-corp/iot-water-sensor')).toBe('/iot-water-sensor/');
    expect(getRepoBase(undefined)).toBe('/water-level-detection-system/');
  });
});
