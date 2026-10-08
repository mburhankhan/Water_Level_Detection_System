// Core TypeScript Data Types for Water Monitor

export type Role = 'admin' | 'user';

export type UserTheme = 'system' | 'light' | 'dark';

export interface UserPrefs {
  timeZone: string; // e.g., "Asia/Karachi"
  use24h: boolean;
  theme: UserTheme;
}

export interface UserRecord {
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  profileId: string;
  createdAt: number; // epoch ms (UTC)
  createdBy: string; // admin UID
  prefs: UserPrefs;
  deviceIds?: Record<string, boolean>;
  mustChangePassword?: boolean;
}

export interface DeviceIndexEntry {
  name: string;
  type: DeviceType;
}

export interface AlertProfileTypes {
  available: boolean;
  finished: boolean;
  reminder: boolean;
  offline: boolean;
}

export interface AlertProfile {
  id: string;
  name: string;
  order: number;
  maxPerHour: number; // 0 = unlimited
  reminderIntervalMin: number; // 0 = off
  types: AlertProfileTypes;
  ntfyTopic: string;
}

export type DeviceType = 'pipeline' | 'pump';

export interface DeviceMeta {
  name: string;
  type: DeviceType;
  ownerUid?: string; // pump only
  createdAt: number; // epoch ms (UTC)
}

export type DeviceState = 'AVAILABLE' | 'FINISHED' | 'UNKNOWN';

export interface DeviceStatus {
  state: DeviceState;
  since: number; // epoch ms
  lastSeen: number; // epoch ms
  appliedSettingsVersion: number;
  fwVersion: string;
}

export interface AvailabilityPeriod {
  id: string;
  start: number; // epoch ms
  end: number | null; // epoch ms or null if ongoing
}

export interface DeviceSettings {
  version: number;
  updatedAt: number;
  values: Record<string, string | number | boolean>;
}

export interface DeviceCommand {
  id: string;
  type: string;
  value: unknown;
  issuedBy: string;
  issuedAt: number;
  expiresAt: number;
}

export interface Device {
  id: string;
  meta: DeviceMeta;
  members: Record<string, boolean>;
  status: DeviceStatus;
  settings: DeviceSettings;
  periods?: Record<string, AvailabilityPeriod>;
}
