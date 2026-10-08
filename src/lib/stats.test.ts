import { describe, it, expect } from 'vitest';
import { computeSupplyStats, slicePeriodByDays, getCircularMedianAndIQR } from './stats';
import { AvailabilityPeriod } from '../types';

describe('stats.ts unit tests', () => {
  const timeZone = 'Asia/Karachi';
  // Fixed reference timestamp: 2026-10-08T12:00:00.000Z (which is 17:00 in Karachi)
  const refNow = 1791460800000;

  it('handles empty data correctly', () => {
    const periods: AvailabilityPeriod[] = [];
    const stats = computeSupplyStats(periods, 7, timeZone, refNow);

    expect(stats.totalPeriods).toBe(0);
    expect(stats.summarySentence).toBe('Not enough data yet');
    expect(stats.todayTotalMinutes).toBe(0);
    expect(stats.weekdayStats.every((w) => w.count === 0 && w.medianTimeStr === null)).toBe(true);
    expect(stats.hourlyProbabilities.every((h) => h.probabilityPct === 0)).toBe(true);
    expect(stats.dailyTotals.length).toBe(7);
    expect(stats.dailyTotals.every((d) => d.totalMinutes === 0)).toBe(true);
  });

  it('handles fewer than 5 periods with "Not enough data yet"', () => {
    const periods: AvailabilityPeriod[] = [
      { id: 'p1', start: refNow - 4 * 86400000, end: refNow - 4 * 86400000 + 7200000 },
      { id: 'p2', start: refNow - 3 * 86400000, end: refNow - 3 * 86400000 + 7200000 },
      { id: 'p3', start: refNow - 2 * 86400000, end: refNow - 2 * 86400000 + 7200000 },
      { id: 'p4', start: refNow - 1 * 86400000, end: refNow - 1 * 86400000 + 7200000 },
    ];

    const stats = computeSupplyStats(periods, 7, timeZone, refNow);
    expect(stats.totalPeriods).toBe(4);
    expect(stats.summarySentence).toBe('Not enough data yet');
  });

  it('correctly handles a period crossing midnight into two distinct day slices', () => {
    // Karachi is UTC+5.
    // 2026-10-07 23:00 PKT = 2026-10-07 18:00 UTC
    // 2026-10-08 02:00 PKT = 2026-10-07 21:00 UTC
    // Duration is 3 hours: 1 hour before midnight (23:00-24:00) and 2 hours after midnight (00:00-02:00)
    const startEpoch = Date.UTC(2026, 9, 7, 18, 0, 0); // 23:00 PKT
    const endEpoch = Date.UTC(2026, 9, 7, 21, 0, 0); // 02:00 PKT next day

    const period: AvailabilityPeriod = {
      id: 'cross-midnight',
      start: startEpoch,
      end: endEpoch,
    };

    const slices = slicePeriodByDays(period, timeZone, refNow);
    expect(slices.length).toBe(2);

    // First slice: Oct 7, from 23:00 (1380m) to midnight (1440m) = 60 minutes
    expect(slices[0].dateString).toBe('2026-10-07');
    expect(slices[0].durationMinutes).toBe(60);
    expect(slices[0].startMinuteOfDay).toBe(1380);
    expect(slices[0].endMinuteOfDay).toBe(1440);

    // Second slice: Oct 8, from midnight (0m) to 02:00 (120m) = 120 minutes
    expect(slices[1].dateString).toBe('2026-10-08');
    expect(slices[1].durationMinutes).toBe(120);
    expect(slices[1].startMinuteOfDay).toBe(0);
    expect(slices[1].endMinuteOfDay).toBe(120);

    // In computeSupplyStats: check daily totals reflect split minutes
    const stats = computeSupplyStats([period], 7, timeZone, refNow);
    const day1 = stats.dailyTotals.find((d) => d.dateString === '2026-10-07');
    const day2 = stats.dailyTotals.find((d) => d.dateString === '2026-10-08');

    expect(day1?.totalMinutes).toBe(60);
    expect(day2?.totalMinutes).toBe(120);
  });

  it('correctly handles ongoing periods (end = null) counting up to "now"', () => {
    // Started 90 minutes before refNow
    const startEpoch = refNow - 90 * 60 * 1000;
    const ongoingPeriod: AvailabilityPeriod = {
      id: 'ongoing-1',
      start: startEpoch,
      end: null,
    };

    const slices = slicePeriodByDays(ongoingPeriod, timeZone, refNow);
    expect(slices.length).toBe(1);
    expect(slices[0].durationMinutes).toBe(90);
    expect(slices[0].ongoing).toBe(true);

    const stats = computeSupplyStats([ongoingPeriod], 7, timeZone, refNow);
    expect(stats.todayTotalMinutes).toBe(90);
  });

  it('computes circular median correctly for midnight arrivals (e.g. 23:50 and 00:10)', () => {
    // 23:50 = 1430 minutes, 00:10 = 10 minutes
    const minutes = [1430, 10];
    const circ = getCircularMedianAndIQR(minutes);
    expect(circ).not.toBeNull();
    // Circular median of 23:50 (-10m) and 00:10 (+10m) is 00:00 (0 minutes)
    expect(circ?.median).toBe(0);
    expect(circ?.iqr).toBe(10); // Q3 (5m) - Q1 (-5m) = 10m

    // Multiple arrivals around midnight: 23:45 (-15m), 23:55 (-5m), 00:05 (+5m), 00:15 (+15m)
    const circ2 = getCircularMedianAndIQR([1425, 1435, 5, 15]);
    expect(circ2?.median).toBe(0);
    expect(circ2?.iqr).toBe(15); // Q3 (7.5m) - Q1 (-7.5m) = 15m
  });

  it('dynamically computes the summary sentence from data (not hardcoded)', () => {
    // Scenario 1: Early morning supply at 06:40 PKT
    const morningPeriods: AvailabilityPeriod[] = [];
    for (let i = 1; i <= 6; i++) {
      // 06:40 in Karachi is 01:40 UTC
      const dayUtc = Date.UTC(2026, 8, 20 + i, 1, 40, 0);
      morningPeriods.push({
        id: `morning-${i}`,
        start: dayUtc,
        end: dayUtc + 2 * 3600 * 1000,
      });
    }

    const testNow = Date.UTC(2026, 8, 28, 12, 0, 0);
    const morningStats = computeSupplyStats(morningPeriods, 30, timeZone, testNow);
    expect(morningStats.summarySentence).toBe('Water usually arrives around 06:40 on weekdays');

    // Scenario 2: Afternoon supply at 14:15 PKT (09:15 UTC) -> sentence MUST change!
    const afternoonPeriods: AvailabilityPeriod[] = [];
    for (let i = 1; i <= 6; i++) {
      // 14:15 in Karachi is 09:15 UTC
      const dayUtc = Date.UTC(2026, 8, 20 + i, 9, 15, 0);
      afternoonPeriods.push({
        id: `afternoon-${i}`,
        start: dayUtc,
        end: dayUtc + 2 * 3600 * 1000,
      });
    }

    const afternoonStats = computeSupplyStats(afternoonPeriods, 30, timeZone, testNow);
    expect(afternoonStats.summarySentence).toBe('Water usually arrives around 14:15 on weekdays');
    expect(afternoonStats.summarySentence).not.toBe(morningStats.summarySentence);
  });
});
