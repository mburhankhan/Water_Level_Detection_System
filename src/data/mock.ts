// Mock data for Demo Mode when Firebase environment variables are not configured

import {
  UserRecord,
  AlertProfile,
  Device,
  AvailabilityPeriod,
} from '../types';
import { getDefaultSettings } from '../config/settingsSchema';

export const MOCK_ADMIN_UID = 'admin-uid-123';
export const MOCK_USER_UID = 'user-uid-456';
export const MOCK_INACTIVE_UID = 'user-uid-inactive';

// Generate realistic periods over the past 30 days for water supply
// In Karachi, water typically arrives in the early morning (~06:00 to ~08:00) 3-4 days a week
export function generateMockPeriods(ongoing: boolean): Record<string, AvailabilityPeriod> {
  const periods: Record<string, AvailabilityPeriod> = {};
  const now = Date.now();
  const dayMs = 86400000;

  // Generate 22 historical periods over last 30 days
  for (let i = 28; i >= 1; i--) {
    // Schedule water on days with (i % 2 === 0 or i % 3 === 0)
    if (i % 2 === 0 || i % 3 === 0) {
      const dayStart = now - i * dayMs;
      // Start between 06:15 and 07:30
      const startHour = 6 + (i % 2) * 0.5 + ((i % 5) * 6) / 60;
      const startMs = new Date(dayStart).setHours(Math.floor(startHour), Math.floor((startHour % 1) * 60), 0, 0);
      // Duration between 1.2h and 2.8h
      const durationHours = 1.3 + ((i * 7) % 15) / 10;
      const endMs = startMs + Math.round(durationHours * 3600 * 1000);

      const periodId = `period-day-${i}`;
      periods[periodId] = {
        id: periodId,
        start: startMs,
        end: endMs,
      };
    }
  }

  // Today's period
  if (ongoing) {
    const todayPeriodId = 'period-today-ongoing';
    const startMs = now - 72 * 60 * 1000; // Started 1 hour 12 mins ago
    periods[todayPeriodId] = {
      id: todayPeriodId,
      start: startMs,
      end: null, // Ongoing
    };
  }

  return periods;
}

export const MOCK_USERS: Record<string, UserRecord> = {
  [MOCK_ADMIN_UID]: {
    email: 'admin@watermonitor.local',
    displayName: 'Admin (System)',
    role: 'admin',
    active: true,
    profileId: '',
    createdAt: Date.now() - 60 * 86400000,
    createdBy: MOCK_ADMIN_UID,
    prefs: {
      timeZone: 'Asia/Karachi',
      use24h: false,
      theme: 'system',
    },
    deviceIds: {
      'dev-pipe-01': true,
      'dev-pipe-02': true,
    },
  },
  [MOCK_USER_UID]: {
    email: 'resident@watermonitor.local',
    displayName: 'Tariq Ahmed',
    role: 'user',
    active: true,
    profileId: 'prof-daytime',
    createdAt: Date.now() - 25 * 86400000,
    createdBy: MOCK_ADMIN_UID,
    prefs: {
      timeZone: 'Asia/Karachi',
      use24h: false,
      theme: 'system',
    },
    deviceIds: {
      'dev-pipe-01': true,
    },
  },
  [MOCK_INACTIVE_UID]: {
    email: 'inactive@watermonitor.local',
    displayName: 'Deactivated Resident',
    role: 'user',
    active: false,
    profileId: 'prof-all',
    createdAt: Date.now() - 10 * 86400000,
    createdBy: MOCK_ADMIN_UID,
    prefs: {
      timeZone: 'Asia/Karachi',
      use24h: false,
      theme: 'system',
    },
    deviceIds: {
      'dev-pipe-01': true,
    },
  },
};

export const MOCK_DEVICE_INDEX: Record<string, { name: string; type: 'pipeline' | 'pump' }> = {
  'dev-pipe-01': {
    name: 'Main Street Pipeline',
    type: 'pipeline',
  },
  'dev-pipe-02': {
    name: 'North Sector Auxiliary Line',
    type: 'pipeline',
  },
};

export const MOCK_ALERT_PROFILES: Record<string, AlertProfile> = {
  'prof-all': {
    id: 'prof-all',
    name: 'Full Alerts (Day & Night)',
    order: 1,
    maxPerHour: 0,
    reminderIntervalMin: 30,
    types: {
      available: true,
      finished: true,
      reminder: true,
      offline: true,
    },
    ntfyTopic: 'wm-karachi-main-line',
  },
  'prof-daytime': {
    id: 'prof-daytime',
    name: 'Start & Finish Only',
    order: 2,
    maxPerHour: 2,
    reminderIntervalMin: 0,
    types: {
      available: true,
      finished: true,
      reminder: false,
      offline: true,
    },
    ntfyTopic: 'wm-karachi-daytime',
  },
  'prof-urgent': {
    id: 'prof-urgent',
    name: 'Urgent Only (No reminders)',
    order: 3,
    maxPerHour: 1,
    reminderIntervalMin: 0,
    types: {
      available: true,
      finished: false,
      reminder: false,
      offline: true,
    },
    ntfyTopic: 'wm-karachi-urgent',
  },
};

export const MOCK_DEVICES: Record<string, Device> = {
  'dev-pipe-01': {
    id: 'dev-pipe-01',
    meta: {
      name: 'Main Street Pipeline',
      type: 'pipeline',
      createdAt: Date.now() - 90 * 86400000,
    },
    members: {
      [MOCK_ADMIN_UID]: true,
      [MOCK_USER_UID]: true,
    },
    status: {
      state: 'AVAILABLE',
      since: Date.now() - 72 * 60 * 1000, // Available for 1h 12m
      lastSeen: Date.now() - 25 * 1000, // 25s ago
      appliedSettingsVersion: 3,
      fwVersion: 'v1.4.2-esp32',
    },
    settings: {
      version: 3,
      updatedAt: Date.now() - 86400000,
      values: getDefaultSettings('pipeline'),
    },
    periods: generateMockPeriods(true),
  },
  'dev-pipe-02': {
    id: 'dev-pipe-02',
    meta: {
      name: 'North Sector Auxiliary Line',
      type: 'pipeline',
      createdAt: Date.now() - 45 * 86400000,
    },
    members: {
      [MOCK_ADMIN_UID]: true,
    },
    status: {
      state: 'FINISHED',
      since: Date.now() - 4.5 * 3600 * 1000, // Finished 4h 30m ago
      lastSeen: Date.now() - 50 * 1000,
      appliedSettingsVersion: 1,
      fwVersion: 'v1.4.0-esp32',
    },
    settings: {
      version: 1,
      updatedAt: Date.now() - 7 * 86400000,
      values: getDefaultSettings('pipeline'),
    },
    periods: generateMockPeriods(false),
  },
};
