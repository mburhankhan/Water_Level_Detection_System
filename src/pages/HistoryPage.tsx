import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Download,
  Calendar,
  Clock,
  Droplet,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  formatDuration,
  formatTimeInTimeZone,
  formatDateInTimeZone,
} from '../lib/dateUtils';
import { computeSupplyStats } from '../lib/stats';
import { DEFAULT_TIMEZONE } from '../config/constants';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const HistoryPage: React.FC = () => {
  const { currentDevice, periods, selectedRangeDays, setSelectedRangeDays } = useDevice();
  const { userRecord } = useAuth();
  const [now] = useState<number>(Date.now());

  const timeZone = userRecord?.prefs?.timeZone || DEFAULT_TIMEZONE;
  const use24h = Boolean(userRecord?.prefs?.use24h);

  // Compute full analytics for selected range (7, 30, or 90 days)
  const stats = computeSupplyStats(periods, selectedRangeDays, timeZone, now);

  // Filter periods strictly within the selected range for the list
  const rangeStartMs = now - selectedRangeDays * 86400000;
  const filteredPeriods = periods.filter((p) => {
    const effectiveEnd = p.end !== null ? p.end : now;
    return effectiveEnd >= rangeStartMs && p.start <= now;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (!currentDevice || filteredPeriods.length === 0) return;

    const headers = [
      'Device_Name',
      'Period_ID',
      'Start_Epoch_UTC',
      'End_Epoch_UTC',
      'Start_Local_Time',
      'End_Local_Time',
      'Duration_Minutes',
      'Is_Ongoing',
      'TimeZone',
    ];

    const rows = filteredPeriods.map((p) => {
      const isOngoing = p.end === null;
      const effectiveEnd = p.end !== null ? p.end : now;
      const durationMin = Math.round((effectiveEnd - p.start) / 60000);
      const startLocal = `${formatDateInTimeZone(p.start, timeZone)} ${formatTimeInTimeZone(p.start, timeZone, use24h)}`;
      const endLocal = isOngoing
        ? 'Ongoing'
        : `${formatDateInTimeZone(p.end!, timeZone)} ${formatTimeInTimeZone(p.end!, timeZone, use24h)}`;

      return [
        `"${currentDevice.meta.name.replace(/"/g, '""')}"`,
        p.id,
        p.start,
        p.end !== null ? p.end : '',
        `"${startLocal}"`,
        `"${endLocal}"`,
        durationMin,
        isOngoing ? 'TRUE' : 'FALSE',
        timeZone,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `water_monitor_${currentDevice.id}_${selectedRangeDays}d_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentDevice) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-700/60">
        <Droplet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="font-medium text-white">No Assigned Device</p>
      </div>
    );
  }

  // Bar chart dataset: display daily totals
  const barChartData = stats.dailyTotals.map((d) => ({
    date: d.dateString.slice(5), // "MM-DD"
    hours: d.totalHours,
    fullLabel: d.dayLabel,
  }));

  return (
    <div className="space-y-4">
      {/* Top Header & Range Chips & CSV Export */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Supply History</h1>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {currentDevice.meta.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredPeriods.length === 0}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-750 hover:bg-slate-700 active:scale-[0.99] text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Range Selector Chips (7 / 30 / 90 days) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Range:</span>
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setSelectedRangeDays(days)}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                selectedRangeDays === days
                  ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md shadow-sky-500/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white hover:bg-slate-800'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Daily Total-Hours Bar Chart */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Daily Availability (Hours / Day)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedRangeDays}d window
          </span>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={selectedRangeDays === 90 ? 14 : selectedRangeDays === 30 ? 4 : 0}
              />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="h" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white shadow-xl">
                        <p className="font-semibold text-slate-300">{data.fullLabel}</p>
                        <p className="font-bold text-sky-400 font-mono mt-0.5">
                          {data.hours} hours available
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Day 24-Hour Timeline Chart (Visual stack for recent days) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              24-Hour Daily Timelines
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">Midnight &rarr; Midnight</span>
        </div>

        {/* Stack of daily bars */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {stats.dailyTotals.slice(-14).reverse().map((day) => (
            <div key={day.dateString} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-300">{day.dayLabel}</span>
                <span className="font-mono text-sky-400 font-semibold text-[11px]">
                  {formatDuration(day.totalMinutes * 60000)}
                </span>
              </div>

              {/* 24-Hour bar strip */}
              <div className="relative w-full h-4 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center">
                {day.segments.map((seg, idx) => {
                  const leftPct = (seg.startFraction * 100).toFixed(2);
                  const widthPct = Math.max(1, (seg.endFraction - seg.startFraction) * 100).toFixed(2);
                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 bottom-0 rounded-sm ${
                        seg.ongoing
                          ? 'bg-sky-400 animate-pulse'
                          : 'bg-sky-500'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      title={`Available: ${formatDuration(seg.durationMinutes * 60000)}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* List of Periods */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Availability Periods ({filteredPeriods.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Newest first</span>
        </div>

        {filteredPeriods.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No water availability recorded in this time window.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredPeriods.map((period) => {
              const isOngoing = period.end === null;
              const effectiveEnd = period.end !== null ? period.end : now;
              const duration = formatDuration(effectiveEnd - period.start);
              const startDateStr = formatDateInTimeZone(period.start, timeZone);
              const startTimeStr = formatTimeInTimeZone(period.start, timeZone, use24h);
              const endTimeStr = isOngoing
                ? 'Now'
                : formatTimeInTimeZone(period.end!, timeZone, use24h);

              return (
                <div
                  key={period.id}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{startDateStr}</span>
                      {isOngoing && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                          Ongoing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {startTimeStr} &rarr; {endTimeStr}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sky-400 text-sm block">
                      {duration}
                    </span>
                    <span className="text-[10px] text-slate-500">Duration</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
