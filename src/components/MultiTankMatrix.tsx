import React from 'react';
import { Tank } from '../types';
import { Layers, ArrowRight, ShieldCheck, AlertTriangle, Droplets } from 'lucide-react';
import { soundManager } from '../utils/audioAlert';

interface MultiTankMatrixProps {
  tanks: Tank[];
  activeTankId: string;
  onSelectTank: (tankId: string) => void;
  onTransferWater: (fromId: string, toId: string) => void;
}

export const MultiTankMatrix: React.FC<MultiTankMatrixProps> = ({
  tanks,
  activeTankId,
  onSelectTank,
  onTransferWater,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Multi-Tank Storage Matrix</h3>
            <p className="text-xs text-slate-400">
              Overview of all monitored reservoirs, sump tanks &amp; transfer pumps
            </p>
          </div>
        </div>

        {/* Quick transfer action button */}
        {tanks.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBuzzer('pump_start');
              onTransferWater('sump-tank', 'roof-main');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow"
          >
            <Droplets className="w-3.5 h-3.5" /> Transfer: Sump &rarr; Roof Tank
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {tanks.map((t) => {
          const isActive = t.id === activeTankId;
          const currentVol = Math.round((t.currentLevelPct / 100) * t.capacityLiters);
          const isWarning = t.currentLevelPct >= t.criticalOverflowPct || t.currentLevelPct <= t.criticalLowPct;

          return (
            <div
              key={t.id}
              onClick={() => onSelectTank(t.id)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-800/80 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {t.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      isWarning
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {isWarning ? 'ALERT' : 'OPTIMAL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{t.location}</p>

                {/* Level Percentage & Volume */}
                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold font-mono text-white">
                      {t.currentLevelPct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400 block">
                      {currentVol.toLocaleString()} / {t.capacityLiters.toLocaleString()} L
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block">Relay Status:</span>
                    <span
                      className={`font-mono font-bold ${
                        t.pumpStatus === 'pumping_in' ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {t.pumpStatus === 'pumping_in' ? 'RUNNING' : 'IDLE'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      t.currentLevelPct >= t.criticalOverflowPct
                        ? 'bg-rose-500'
                        : t.currentLevelPct <= t.lowThresholdPct
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, t.currentLevelPct))}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Sensor: Ultrasonic (HC-SR04)</span>
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  {isActive ? 'Active Tank' : 'Select'} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
