import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import {
  CalendarClock,
  Sparkles,
  BarChart3,
  Calendar,
  Clock,
  Info,
  Droplet,
} from 'lucide-react';
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

export const SchedulePage: React.FC = () => {
  const { currentDevice, periods, selectedRangeDays, setSelectedRangeDays } = useDevice();
  const { userRecord } = useAuth();
  const [now] = useState<number>(Date.now());

  const timeZone = userRecord?.prefs?.timeZone || DEFAULT_TIMEZONE;

  const stats = computeSupplyStats(periods, selectedRangeDays, timeZone, now);

  if (!currentDevice) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-700/60">
        <Droplet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="font-medium text-white">No Assigned Device</p>
      </div>
    );
  }

  // Format hourly data for chart
  const hourlyData = stats.hourlyProbabilities.map((h) => ({
    hour: h.hourLabel,
    prob: h.probabilityPct,
  }));

  return (
    <div className="space-y-4">
      {/* Top Header & Range Chips */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Supply Schedule</h1>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {currentDevice.meta.name}
              </p>
            </div>
          </div>

          {/* Range Chips (7 / 30 / 90 days) */}
          <div className="flex items-center gap-1.5">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setSelectedRangeDays(days)}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedRangeDays === days
                    ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white hover:bg-slate-800'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Feature (c): Plain English Summary Sentence Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-slate-900/90 border border-sky-500/30 flex items-start gap-3 shadow-inner">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 block mb-0.5">
              Predictive Arrival Pattern
            </span>
            <p className="text-sm font-bold text-white leading-snug">
              {stats.summarySentence}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.totalPeriods < 5
                ? 'Requires at least 5 recorded availability periods to compute confidence pattern.'
                : `Based on ${stats.totalPeriods} periods analyzed over the past ${selectedRangeDays} days in ${timeZone}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Feature (b): Availability Probability by Hour of Day (0-100%) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Arrival Probability by Hour (0% - 100%)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">24-Hour Day</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Likelihood that water is running during each hour window.
        </p>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                stroke="#64748b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white shadow-xl">
                        <p className="font-semibold text-slate-300">{data.hour}</p>
                        <p className="font-bold text-sky-400 font-mono mt-0.5">
                          {data.prob}% probability of water
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="prob" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature (a): Per-Weekday Median Start Time with IQR */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Weekday Schedule &amp; Variability (IQR)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Mon - Sun</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Median start time and interquartile spread per day of week.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {stats.weekdayStats.map((stat) => (
            <div
              key={stat.weekdayIndex}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-white block">{stat.weekdayName}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {stat.count === 1 ? '1 period recorded' : `${stat.count} periods recorded`}
                </span>
              </div>

              <div className="text-right">
                {stat.count > 0 && stat.medianTimeStr ? (
                  <>
                    <span className="font-bold text-sky-400 text-sm font-mono block">
                      ~{stat.medianTimeStr}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      IQR: &plusmn;{Math.round((stat.iqrMinutes || 0) / 2)}m spread
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">No data</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
