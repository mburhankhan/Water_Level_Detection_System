// Pure statistical analysis functions for Water Monitor
// All calculations are timezone-aware and handle periods crossing midnight, ongoing periods, and range clipping.

import { AvailabilityPeriod } from '../types';
import { getDatePartsInTimeZone, getStartOfDayInTimeZone } from './dateUtils';
import { DEFAULT_TIMEZONE } from '../config/constants';

export interface WeekdayStat {
  weekdayIndex: number; // 0=Sun, 1=Mon, ..., 6=Sat
  weekdayName: string;
  count: number;
  medianMinutes: number | null; // minutes from midnight (0 - 1439)
  medianTimeStr: string | null; // e.g. "06:40"
  q1Minutes: number | null;
  q3Minutes: number | null;
  iqrMinutes: number | null; // Interquartile range in minutes
}

export interface HourlyProbability {
  hour: number; // 0 - 23
  hourLabel: string; // "00:00", "01:00", ...
  probabilityPct: number; // 0 - 100%
  totalMinutesAvailable: number;
}

export interface DayTotal {
  dateString: string; // YYYY-MM-DD
  dayLabel: string; // "Wed, Oct 7"
  totalMinutes: number;
  totalHours: number;
  segments: {
    startFraction: number; // 0.0 to 1.0 (of the 24 hour day)
    endFraction: number; // 0.0 to 1.0
    durationMinutes: number;
    ongoing: boolean;
  }[];
}

export interface SupplyStats {
  summarySentence: string;
  totalPeriods: number;
  weekdayStats: WeekdayStat[];
  hourlyProbabilities: HourlyProbability[];
  dailyTotals: DayTotal[];
  todayTotalMinutes: number;
}

// Calculate percentile from sorted number array using linear interpolation
export function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Calculate circular median and IQR on a 1440-minute circle (24 hours)
// Handles arrival clusters around midnight (e.g., 23:50 and 00:10) without linear discontinuity
export function getCircularMedianAndIQR(minutesArray: number[]): {
  median: number;
  q1: number;
  q3: number;
  iqr: number;
} | null {
  if (minutesArray.length === 0) return null;
  if (minutesArray.length === 1) {
    return {
      median: Math.round(minutesArray[0]),
      q1: Math.round(minutesArray[0]),
      q3: Math.round(minutesArray[0]),
      iqr: 0,
    };
  }

  // Convert each minute to an angle in radians [0, 2pi)
  let sumSin = 0;
  let sumCos = 0;
  for (const m of minutesArray) {
    const angle = (m / 1440) * 2 * Math.PI;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
  }

  // Circular mean direction
  let meanAngle = Math.atan2(sumSin, sumCos);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;
  const meanMinute = (meanAngle / (2 * Math.PI)) * 1440;

  // Unwrap each minute relative to meanMinute into [-720, +720)
  const unwrapped = minutesArray.map((m) => {
    let diff = (m - meanMinute) % 1440;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
  });

  unwrapped.sort((a, b) => a - b);

  const q1Diff = getPercentile(unwrapped, 25);
  const medianDiff = getPercentile(unwrapped, 50);
  const q3Diff = getPercentile(unwrapped, 75);
  const iqr = q3Diff - q1Diff;

  // Wrap median back to [0, 1440)
  let finalMedian = (meanMinute + medianDiff) % 1440;
  if (finalMedian < 0) finalMedian += 1440;

  let finalQ1 = (meanMinute + q1Diff) % 1440;
  if (finalQ1 < 0) finalQ1 += 1440;

  let finalQ3 = (meanMinute + q3Diff) % 1440;
  if (finalQ3 < 0) finalQ3 += 1440;

  return {
    median: Math.round(finalMedian),
    q1: Math.round(finalQ1),
    q3: Math.round(finalQ3),
    iqr: Math.round(iqr),
  };
}

// Format minutes from midnight to HH:mm
export function minutesToTimeStr(totalMinutes: number): string {
  const m = Math.round(totalMinutes) % 1440;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Split a period into single-calendar-day intervals in the given timezone
export interface PeriodDaySlice {
  dateString: string;
  startMinuteOfDay: number; // 0 - 1440
  endMinuteOfDay: number; // 0 - 1440
  durationMinutes: number;
  ongoing: boolean;
}

export function slicePeriodByDays(
  period: AvailabilityPeriod,
  timeZone: string = DEFAULT_TIMEZONE,
  nowMs: number = Date.now()
): PeriodDaySlice[] {
  const effectiveEnd = period.end !== null ? period.end : nowMs;
  if (effectiveEnd <= period.start) return [];

  const slices: PeriodDaySlice[] = [];
  let cursor = period.start;

  while (cursor < effectiveEnd) {
    const parts = getDatePartsInTimeZone(cursor, timeZone);
    const dayStartEpoch = getStartOfDayInTimeZone(cursor, timeZone);
    const nextDayStartEpoch = getStartOfDayInTimeZone(dayStartEpoch + 86400000 + 3600000, timeZone);

    const sliceEnd = Math.min(effectiveEnd, nextDayStartEpoch);

    const startMinuteOfDay = parts.hour * 60 + parts.minute + parts.second / 60;
    const durationMinutes = (sliceEnd - cursor) / 60000;
    const endMinuteOfDay = Math.min(1440, startMinuteOfDay + durationMinutes);

    slices.push({
      dateString: parts.dateString,
      startMinuteOfDay,
      endMinuteOfDay,
      durationMinutes,
      ongoing: period.end === null && sliceEnd === effectiveEnd,
    });

    cursor = sliceEnd;
  }

  return slices;
}

export function computeSupplyStats(
  periods: AvailabilityPeriod[],
  rangeDays: number,
  timeZone: string = DEFAULT_TIMEZONE,
  nowMs: number = Date.now()
): SupplyStats {
  const rangeStartMs = nowMs - rangeDays * 86400000;

  // Clip every period to the selected range window [rangeStartMs, nowMs]
  // This counts periods that began just before the range or are still ongoing from before it
  const clippedPeriods: AvailabilityPeriod[] = [];
  const startTimesWithinRange: { weekday: number; minuteOfDay: number }[] = [];

  for (const period of periods) {
    const periodRawEnd = period.end !== null ? period.end : nowMs;
    const clippedStart = Math.max(period.start, rangeStartMs);
    const clippedEnd = Math.min(periodRawEnd, nowMs);

    if (clippedEnd > clippedStart) {
      clippedPeriods.push({
        id: period.id,
        start: clippedStart,
        end: period.end === null && periodRawEnd >= nowMs ? null : clippedEnd,
      });

      // If the arrival itself occurred inside the range, record its time for schedule calculation
      if (period.start >= rangeStartMs && period.start <= nowMs) {
        const pParts = getDatePartsInTimeZone(period.start, timeZone);
        startTimesWithinRange.push({
          weekday: pParts.weekday,
          minuteOfDay: pParts.hour * 60 + pParts.minute,
        });
      }
    }
  }

  // Weekday minute collections (0 = Sun, ..., 6 = Sat)
  const weekdayStartMinutes: Record<number, number[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (const item of startTimesWithinRange) {
    weekdayStartMinutes[item.weekday].push(item.minuteOfDay);
  }

  // Day breakdown
  const daySlicesMap: Record<string, PeriodDaySlice[]> = {};

  const hourDayHits: Record<number, Set<string>> = {};
  const hourMinutesTotal: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    hourDayHits[h] = new Set();
    hourMinutesTotal[h] = 0;
  }

  for (const period of clippedPeriods) {
    const slices = slicePeriodByDays(period, timeZone, nowMs);

    for (const slice of slices) {
      if (!daySlicesMap[slice.dateString]) {
        daySlicesMap[slice.dateString] = [];
      }
      daySlicesMap[slice.dateString].push(slice);

      const startHour = Math.floor(slice.startMinuteOfDay / 60);
      const endHour = Math.min(23, Math.floor(slice.endMinuteOfDay / 60));

      for (let h = startHour; h <= endHour; h++) {
        const hourStartMin = h * 60;
        const hourEndMin = (h + 1) * 60;
        const overlapStart = Math.max(hourStartMin, slice.startMinuteOfDay);
        const overlapEnd = Math.min(hourEndMin, slice.endMinuteOfDay);
        const overlapMin = Math.max(0, overlapEnd - overlapStart);

        if (overlapMin > 0) {
          hourDayHits[h].add(slice.dateString);
          hourMinutesTotal[h] += overlapMin;
        }
      }
    }
  }

  const totalPeriods = clippedPeriods.length;

  // 1. Plain English Summary Sentence using circular median
  let summarySentence = 'Not enough data yet';
  if (startTimesWithinRange.length >= 5) {
    // Weekday start times (Mon=1 to Fri=5)
    const weekdayMinutes: number[] = [];
    for (let w = 1; w <= 5; w++) {
      weekdayMinutes.push(...weekdayStartMinutes[w]);
    }

    if (weekdayMinutes.length >= 3) {
      const circ = getCircularMedianAndIQR(weekdayMinutes);
      if (circ) {
        const timeStr = minutesToTimeStr(circ.median);
        summarySentence = `Water usually arrives around ${timeStr} on weekdays`;
      }
    } else {
      const allMinutes: number[] = startTimesWithinRange.map((s) => s.minuteOfDay);
      const circ = getCircularMedianAndIQR(allMinutes);
      if (circ) {
        const timeStr = minutesToTimeStr(circ.median);
        summarySentence = `Water usually arrives around ${timeStr}`;
      }
    }
  }

  // 2. Per-Weekday Circular Median & IQR
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayStats: WeekdayStat[] = [];
  const orderedWeekdays = [1, 2, 3, 4, 5, 6, 0]; // Mon through Sun

  for (const w of orderedWeekdays) {
    const list = weekdayStartMinutes[w];
    if (list.length === 0) {
      weekdayStats.push({
        weekdayIndex: w,
        weekdayName: weekdayNames[w],
        count: 0,
        medianMinutes: null,
        medianTimeStr: null,
        q1Minutes: null,
        q3Minutes: null,
        iqrMinutes: null,
      });
    } else {
      const circ = getCircularMedianAndIQR(list);
      weekdayStats.push({
        weekdayIndex: w,
        weekdayName: weekdayNames[w],
        count: list.length,
        medianMinutes: circ ? circ.median : null,
        medianTimeStr: circ ? minutesToTimeStr(circ.median) : null,
        q1Minutes: circ ? circ.q1 : null,
        q3Minutes: circ ? circ.q3 : null,
        iqrMinutes: circ ? circ.iqr : null,
      });
    }
  }

  // 3. Hourly Probabilities (0-100%)
  const totalDaysSample = Math.max(1, rangeDays);
  const hourlyProbabilities: HourlyProbability[] = [];

  for (let h = 0; h < 24; h++) {
    const daysWithWater = hourDayHits[h].size;
    const probabilityPct = Math.min(100, Math.round((daysWithWater / totalDaysSample) * 100));
    hourlyProbabilities.push({
      hour: h,
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      probabilityPct,
      totalMinutesAvailable: Math.round(hourMinutesTotal[h]),
    });
  }

  // 4. Daily Totals & Timeline Segments
  const dailyTotals: DayTotal[] = [];
  const todayParts = getDatePartsInTimeZone(nowMs, timeZone);
  const todayDateString = todayParts.dateString;
  let todayTotalMinutes = 0;

  for (let i = rangeDays - 1; i >= 0; i--) {
    const dayEpoch = nowMs - i * 86400000;
    const p = getDatePartsInTimeZone(dayEpoch, timeZone);
    const dateStr = p.dateString;
    const slices = daySlicesMap[dateStr] || [];

    let totalDayMin = 0;
    const segments = slices.map((s) => {
      totalDayMin += s.durationMinutes;
      return {
        startFraction: Math.max(0, Math.min(1, s.startMinuteOfDay / 1440)),
        endFraction: Math.max(0, Math.min(1, s.endMinuteOfDay / 1440)),
        durationMinutes: s.durationMinutes,
        ongoing: s.ongoing,
      };
    });

    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][p.weekday];
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][p.month - 1];

    if (dateStr === todayDateString) {
      todayTotalMinutes = totalDayMin;
    }

    dailyTotals.push({
      dateString: dateStr,
      dayLabel: `${dayName}, ${monthName} ${p.day}`,
      totalMinutes: Math.round(totalDayMin),
      totalHours: Number((totalDayMin / 60).toFixed(1)),
      segments,
    });
  }

  return {
    summarySentence,
    totalPeriods,
    weekdayStats,
    hourlyProbabilities,
    dailyTotals,
    todayTotalMinutes: Math.round(todayTotalMinutes),
  };
}
