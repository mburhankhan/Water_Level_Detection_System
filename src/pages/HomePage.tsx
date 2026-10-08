import React, { useState, useEffect } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import {
  Droplet,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  formatLiveStateDuration,
  formatTimeInTimeZone,
  formatDateInTimeZone,
  formatDuration,
} from '../lib/dateUtils';
import { computeSupplyStats } from '../lib/stats';
import { DEFAULT_TIMEZONE, FEATURE_PUMP } from '../config/constants';
import { PumpControlStub } from '../components/PumpControlStub';

export const HomePage: React.FC = () => {
  const { devices, currentDevice, setCurrentDeviceId, isOnline, periods } = useDevice();
  const { userRecord } = useAuth();
  const [now, setNow] = useState<number>(Date.now());

  const timeZone = userRecord?.prefs?.timeZone || DEFAULT_TIMEZONE;
  const use24h = Boolean(userRecord?.prefs?.use24h);

  // Live timer tick every 10 seconds to update live duration display
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!currentDevice) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-700/60">
        <Droplet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="font-medium text-white">No Assigned Devices Found</p>
        <p className="text-xs text-slate-400 mt-1">
          No pipeline sensor has been assigned to your account. Contact an administrator.
        </p>
      </div>
    );
  }

  // Derive status
  const rawState = currentDevice.status?.state || 'UNKNOWN';
  // Display OFFLINE state if heartbeat has timed out, while showing last known state
  const isHeartbeatOffline = !isOnline;
  const displayState = isHeartbeatOffline ? 'OFFLINE' : rawState;

  const since = currentDevice.status?.since || now;
  const liveDurationPhrase = formatLiveStateDuration(rawState, since, now);
  const lastChangeTimeFormatted = formatTimeInTimeZone(since, timeZone, use24h);
  const lastChangeDateFormatted = formatDateInTimeZone(since, timeZone);

  // Compute 24-hour strip & today's total available time using stats engine
  const stats = computeSupplyStats(periods, 1, timeZone, now);
  const todayTotalMin = stats.todayTotalMinutes;
  const todayStrip = stats.dailyTotals[0]?.segments || [];

  const StateIcon =
    displayState === 'AVAILABLE'
      ? CheckCircle2
      : displayState === 'FINISHED'
      ? XCircle
      : isHeartbeatOffline
      ? AlertTriangle
      : HelpCircle;

  const stateStyle =
    displayState === 'AVAILABLE'
      ? {
          cardBorder: 'border-sky-500/40',
          badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          iconColor: 'text-sky-400 fill-sky-500/20',
          glow: 'shadow-sky-500/10',
        }
      : displayState === 'FINISHED'
      ? {
          cardBorder: 'border-slate-700/80',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          iconColor: 'text-slate-400',
          glow: 'shadow-black/20',
        }
      : {
          cardBorder: 'border-rose-500/40',
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          iconColor: 'text-rose-400',
          glow: 'shadow-rose-500/10',
        };

  return (
    <div className="space-y-4">
      {/* Optional Device Switcher if user has multiple devices */}
      {devices.length > 1 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 shadow-md flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 pl-1">Monitored Pipeline:</span>
          <div className="relative">
            <select
              value={currentDevice.id}
              onChange={(e) => setCurrentDeviceId(e.target.value)}
              className="min-h-[44px] appearance-none bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.meta.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Primary Large Status Card */}
      <div
        className={`bg-slate-800/90 border ${stateStyle.cardBorder} rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-sm transition-all duration-300 ${stateStyle.glow}`}
      >
        {/* Header row: Device Name & Online Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-sky-400 fill-sky-500" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate max-w-[190px]">
              {currentDevice.meta.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Central State Hero Block */}
        <div className="py-7 flex flex-col items-center justify-center text-center">
          <div className="relative mb-4">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center border shadow-inner ${stateStyle.badgeBg}`}
            >
              <StateIcon className={`w-11 h-11 ${stateStyle.iconColor}`} />
            </div>
            {displayState === 'AVAILABLE' && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500" />
              </span>
            )}
          </div>

          {/* Large State Word */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
            {displayState}
          </h1>

          {/* Live Duration phrase */}
          <p className="text-sm font-semibold text-slate-300 mt-2 bg-slate-900/60 px-4 py-1.5 rounded-full border border-slate-700/50">
            {liveDurationPhrase}
          </p>

          {isHeartbeatOffline && rawState !== 'UNKNOWN' && (
            <p className="text-xs text-rose-300 mt-2">
              (Heartbeat lost; last known state was {rawState})
            </p>
          )}
        </div>

        {/* Last Change Time Meta */}
        <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>State changed at:</span>
          </span>
          <span className="font-mono text-slate-200 font-medium">
            {lastChangeTimeFormatted} ({lastChangeDateFormatted})
          </span>
        </div>
      </div>

      {/* Today's Availability Strip & Total */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Today's Timeline (24 Hours)
            </h2>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-xs">
            <span className="text-slate-400 font-medium">Total:</span>
            <span className="font-bold text-sky-300 font-mono">
              {formatDuration(todayTotalMin * 60000)}
            </span>
          </div>
        </div>

        {/* 24-Hour Visual Strip */}
        <div className="relative w-full h-8 bg-slate-900 rounded-xl border border-slate-700/60 overflow-hidden flex items-center">
          {/* Hour tick marks at 00, 06, 12, 18 */}
          <div className="absolute inset-0 pointer-events-none flex justify-between px-2 text-[9px] font-mono text-slate-600 items-center z-10">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          {/* Render active availability segments */}
          {todayStrip.map((seg, idx) => {
            const leftPct = (seg.startFraction * 100).toFixed(2);
            const widthPct = Math.max(1, (seg.endFraction - seg.startFraction) * 100).toFixed(2);
            return (
              <div
                key={idx}
                className={`absolute top-0 bottom-0 rounded-sm transition-all ${
                  seg.ongoing
                    ? 'bg-gradient-to-r from-sky-500 to-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                    : 'bg-sky-500/85 hover:bg-sky-400'
                }`}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
                title={`Available: ${formatDuration(seg.durationMinutes * 60000)}${
                  seg.ongoing ? ' (Ongoing)' : ''
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
          <span>Midnight (00:00)</span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2 bg-sky-500 rounded-sm inline-block" /> Water Available
          </span>
          <span>Midnight (24:00)</span>
        </div>
      </div>

      {/* Status Details Bar */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Firmware Version</span>
          <span className="font-mono text-slate-200 font-semibold">
            {currentDevice.status?.fwVersion || 'v1.0.0'}
          </span>
        </div>
        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Settings Sync</span>
          <span className="font-mono text-slate-200 font-semibold">
            v{currentDevice.status?.appliedSettingsVersion ?? 0} / v{currentDevice.settings?.version ?? 0}
          </span>
        </div>
      </div>

      {/* Hidden Phase 2 Pump Control Stub */}
      {FEATURE_PUMP && <PumpControlStub device={currentDevice} />}
    </div>
  );
};
