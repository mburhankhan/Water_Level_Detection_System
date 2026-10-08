import React from 'react';
import { Tank } from '../types';
import { Waves, ArrowDown, ArrowUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TankVisualizerProps {
  tank: Tank;
  onQuickAdjust?: (levelPct: number) => void;
  onTogglePump?: () => void;
}

export const TankVisualizer: React.FC<TankVisualizerProps> = ({
  tank,
  onQuickAdjust,
  onTogglePump,
}) => {
  const currentLevel = Math.max(0, Math.min(100, tank.currentLevelPct));
  const waterDepthCm = ((currentLevel / 100) * tank.totalHeightCm).toFixed(1);
  const distanceCm = (tank.totalHeightCm - (currentLevel / 100) * tank.totalHeightCm + 10).toFixed(1);
  const currentVolume = Math.round((currentLevel / 100) * tank.capacityLiters);

  // Status badge logic
  const isOverflow = currentLevel >= tank.criticalOverflowPct;
  const isHighCutoff = currentLevel >= tank.highThresholdPct;
  const isLowRefill = currentLevel <= tank.lowThresholdPct;
  const isCriticalDry = currentLevel <= tank.criticalLowPct;

  // Water theme styling
  const waterGradients = {
    potable: {
      primary: 'from-sky-500/90 via-blue-600/90 to-blue-800/95',
      wave: '#38bdf8',
      bubble: 'rgba(255, 255, 255, 0.4)',
      bg: 'bg-sky-500/10',
    },
    rainwater: {
      primary: 'from-emerald-500/90 via-teal-600/90 to-cyan-800/95',
      wave: '#34d399',
      bubble: 'rgba(255, 255, 255, 0.3)',
      bg: 'bg-emerald-500/10',
    },
    greywater: {
      primary: 'from-slate-500/90 via-teal-700/90 to-slate-800/95',
      wave: '#94a3b8',
      bubble: 'rgba(255, 255, 255, 0.25)',
      bg: 'bg-slate-500/10',
    },
    borewell: {
      primary: 'from-cyan-500/90 via-blue-700/90 to-indigo-900/95',
      wave: '#22d3ee',
      bubble: 'rgba(255, 255, 255, 0.35)',
      bg: 'bg-cyan-500/10',
    },
  }[tank.waterType];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex flex-col justify-between">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {tank.name}
            </h2>
            <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {tank.location}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Max Height: <span className="text-slate-200 font-mono">{tank.totalHeightCm} cm</span> | Capacity: <span className="text-slate-200 font-mono">{tank.capacityLiters.toLocaleString()} L</span>
          </p>
        </div>

        {/* State Badges */}
        <div className="flex items-center gap-2">
          {isOverflow ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-4 h-4" /> OVERFLOW RISK ({currentLevel.toFixed(1)}%)
            </div>
          ) : isCriticalDry ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-4 h-4" /> CRITICAL LOW / DRY RUN ({currentLevel.toFixed(1)}%)
            </div>
          ) : isLowRefill ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-semibold">
              <ArrowUp className="w-4 h-4" /> LOW - REFILL TRIGGER ({currentLevel.toFixed(1)}%)
            </div>
          ) : isHighCutoff ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> FULL / AUTO CUT-OFF ({currentLevel.toFixed(1)}%)
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> NORMAL OPTIMAL ({currentLevel.toFixed(1)}%)
            </div>
          )}
        </div>
      </div>

      {/* Main Tank Cross-Section View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-center">
        {/* Visual Tank Vessel Graphic */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Top Ultrasonic Transducer module mounted on lid */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Ultrasonic Sensor Box (HC-SR04 look) */}
            <div className="bg-slate-800 border-2 border-cyan-500/60 rounded-md px-3 py-1.5 shadow-lg flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-cyan-400 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-cyan-300">HC-SR04 ULTRASONIC SENSOR</span>
            </div>
            {/* Sonar sound pulses traveling down */}
            <div className="w-px h-6 bg-dashed border-l border-cyan-400/60 flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400/40 animate-ping mt-1" />
            </div>
          </div>

          {/* Tank Cylindrical Container */}
          <div className="relative w-full max-w-sm h-80 rounded-3xl border-4 border-slate-700 bg-slate-950/80 shadow-2xl overflow-hidden flex flex-col justify-end p-1">
            {/* Background depth gauge grid lines */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-35 flex flex-col justify-between py-6 px-4">
              <div className="border-b border-dashed border-slate-500/50 w-full" />
              <div className="border-b border-dashed border-slate-500/50 w-full" />
              <div className="border-b border-dashed border-slate-500/50 w-full" />
              <div className="border-b border-dashed border-slate-500/50 w-full" />
            </div>

            {/* Threshold Line: Critical Overflow */}
            <div
              className="absolute left-0 right-0 border-t-2 border-red-500 z-20 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: `${tank.criticalOverflowPct}%` }}
            >
              <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/80 px-1 rounded border border-red-600/50">
                OVERFLOW {tank.criticalOverflowPct}%
              </span>
            </div>

            {/* Threshold Line: High Cutoff */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-sky-400 z-20 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: `${tank.highThresholdPct}%` }}
            >
              <span className="text-[9px] font-mono font-bold text-sky-400 bg-sky-950/80 px-1 rounded border border-sky-600/50">
                CUTOFF {tank.highThresholdPct}%
              </span>
            </div>

            {/* Threshold Line: Low Refill */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 z-20 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: `${tank.lowThresholdPct}%` }}
            >
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1 rounded border border-amber-600/50">
                REFILL {tank.lowThresholdPct}%
              </span>
            </div>

            {/* Threshold Line: Critical Dry */}
            <div
              className="absolute left-0 right-0 border-t-2 border-rose-500 z-20 flex items-center justify-end pr-2 transition-all duration-300 pointer-events-none"
              style={{ bottom: `${tank.criticalLowPct}%` }}
            >
              <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/80 px-1 rounded border border-rose-600/50">
                DRY RUN {tank.criticalLowPct}%
              </span>
            </div>

            {/* Water Filling Inflow Stream Animation (when pump is active) */}
            {tank.pumpStatus === 'pumping_in' && (
              <div className="absolute top-0 left-1/3 -translate-x-1/2 w-3.5 z-20 pointer-events-none" style={{ height: `${100 - currentLevel}%` }}>
                <div className="w-full h-full bg-gradient-to-b from-sky-300 via-cyan-400 to-sky-500 opacity-80 animate-pulse rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 rounded-full bg-cyan-300/40 animate-ping" />
              </div>
            )}

            {/* Water Body Container */}
            <div
              className="relative w-full rounded-b-[20px] transition-all duration-700 ease-out flex flex-col justify-start"
              style={{ height: `${currentLevel}%` }}
            >
              {/* Animated Wave Top */}
              {currentLevel > 0 && (
                <div className="relative w-full -mt-3 h-5 overflow-hidden z-10">
                  <svg
                    className="absolute top-0 w-[200%] h-full animate-wave-slow opacity-75"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,0 C150,90 350,-40 500,50 C650,140 900,-20 1200,40 L1200,120 L0,120 Z"
                      fill={waterGradients.wave}
                    />
                  </svg>
                  <svg
                    className="absolute top-0 w-[200%] h-full animate-wave-fast opacity-50"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,40 C180,-10 380,80 600,20 C820,-30 1020,70 1200,20 L1200,120 L0,120 Z"
                      fill="#ffffff"
                    />
                  </svg>
                </div>
              )}

              {/* Water Bulk Gradient */}
              <div
                className={`w-full h-full bg-gradient-to-b ${waterGradients.primary} relative overflow-hidden backdrop-blur-sm`}
              >
                {/* Floating ambient bubbles */}
                <div className="absolute inset-0 pointer-events-none">
                  <span className="absolute bottom-2 left-1/4 w-2 h-2 rounded-full bg-white/40 animate-bounce" />
                  <span className="absolute bottom-6 right-1/3 w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                  <span className="absolute bottom-12 left-1/2 w-3 h-3 rounded-full bg-white/20 animate-bounce" />
                </div>

                {/* Big Center Volume & % Display inside water */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-4xl font-extrabold font-mono text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    {currentLevel.toFixed(1)}%
                  </span>
                  <span className="text-xs font-semibold text-cyan-100 uppercase tracking-wider drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    {currentVolume.toLocaleString()} Liters
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Drain Outlet */}
            <div className="absolute -bottom-2 right-6 w-5 h-3 bg-slate-800 rounded-b border border-slate-600 flex items-center justify-center">
              {tank.outflowRateLpm > 0 && (
                <div className="w-1.5 h-6 bg-cyan-400 animate-pulse mt-4 rounded-full" />
              )}
            </div>
          </div>

          {/* Quick Level Slider for easy simulation */}
          {onQuickAdjust && (
            <div className="w-full max-w-sm mt-3 px-2 flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" /> Manual Water Adjust
                </span>
                <span className="font-mono text-cyan-400">{currentLevel.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(currentLevel)}
                onChange={(e) => onQuickAdjust(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>

        {/* Telemetry Metric Callouts */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Metric 1: Ultrasonic Distance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Ultrasonic Gap (Sensor to Liquid)
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono text-cyan-300">{distanceCm}</span>
                <span className="text-xs font-semibold text-slate-400">cm</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ArrowDown className="w-5 h-5" />
            </div>
          </div>

          {/* Metric 2: Water Column Depth */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Liquid Column Height
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono text-emerald-300">{waterDepthCm}</span>
                <span className="text-xs font-semibold text-slate-400">cm of {tank.totalHeightCm} cm</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ArrowUp className="w-5 h-5" />
            </div>
          </div>

          {/* Metric 3: Water Volume */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Contained Volume
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono text-blue-300">
                  {currentVolume.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ {tank.capacityLiters.toLocaleString()} L</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Waves className="w-5 h-5" />
            </div>
          </div>

          {/* Pump Status & Fast Control */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Relay Switch (Inlet Pump)
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-3 h-3 rounded-full ${
                    tank.pumpStatus === 'pumping_in'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-slate-600'
                  }`}
                />
                <span className="text-sm font-bold uppercase font-mono text-white">
                  {tank.pumpStatus === 'pumping_in' ? 'PUMP ACTIVE (PUMPING)' : 'IDLE / OFF'}
                </span>
              </div>
            </div>
            {onTogglePump && (
              <button
                type="button"
                onClick={onTogglePump}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                  tank.pumpStatus === 'pumping_in'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {tank.pumpStatus === 'pumping_in' ? 'STOP PUMP' : 'START PUMP'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
