// Timezone-aware date utilities for Water Monitor
// All database timestamps are epoch milliseconds in UTC.
// All UI representations format according to user's chosen timezone (default Asia/Karachi).

import { DEFAULT_TIMEZONE } from '../config/constants';

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  weekday: number; // 0 (Sun) - 6 (Sat)
  dateString: string; // YYYY-MM-DD
}

// Extract calendar parts in a specific timezone
export function getDatePartsInTimeZone(epochMs: number, timeZone: string = DEFAULT_TIMEZONE): DateParts {
  const d = new Date(epochMs);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(d);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let weekdayStr = 'Sun';

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    else if (p.type === 'month') month = parseInt(p.value, 10);
    else if (p.type === 'day') day = parseInt(p.value, 10);
    else if (p.type === 'hour') {
      const h = parseInt(p.value, 10);
      hour = h === 24 ? 0 : h; // Some formatters use 24 for midnight
    } else if (p.type === 'minute') minute = parseInt(p.value, 10);
    else if (p.type === 'second') second = parseInt(p.value, 10);
    else if (p.type === 'weekday') weekdayStr = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateString = `${year}-${pad(month)}-${pad(day)}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: weekdayMap[weekdayStr] ?? 0,
    dateString,
  };
}

// Get the epoch timestamp of midnight (00:00:00.000) for the day containing epochMs in timeZone
export function getStartOfDayInTimeZone(epochMs: number, timeZone: string = DEFAULT_TIMEZONE): number {
  const parts = getDatePartsInTimeZone(epochMs, timeZone);
  // Subtract the elapsed time from midnight in that timezone
  const elapsedMs = (parts.hour * 3600 + parts.minute * 60 + parts.second) * 1000 + (epochMs % 1000);
  return epochMs - elapsedMs;
}

// Format time as HH:mm or hh:mm a
export function formatTimeInTimeZone(
  epochMs: number,
  timeZone: string = DEFAULT_TIMEZONE,
  use24h: boolean = false
): string {
  const d = new Date(epochMs);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24h,
  }).format(d);
}

// Format date as e.g. "Wed, Oct 7"
export function formatDateInTimeZone(epochMs: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const d = new Date(epochMs);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

// Format duration into readable English string: "1h 12m", "45m", "2h"
export function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return '0m';
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

// Format live duration phrase: "Available for 1h 12m" or "Finished 3h ago"
export function formatLiveStateDuration(
  state: 'AVAILABLE' | 'FINISHED' | 'UNKNOWN',
  sinceMs: number,
  nowMs: number = Date.now()
): string {
  const elapsed = Math.max(0, nowMs - sinceMs);
  const durationStr = formatDuration(elapsed);

  if (state === 'AVAILABLE') {
    return `Available for ${durationStr}`;
  }
  if (state === 'FINISHED') {
    return `Finished ${durationStr} ago`;
  }
  return `Unknown for ${durationStr}`;
}
