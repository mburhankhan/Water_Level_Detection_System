import React from 'react';
import { Tank } from '../types';
import { Zap, Power, ShieldAlert, Cpu, Gauge, Droplets, RefreshCw } from 'lucide-react';
import { soundManager } from '../utils/audioAlert';

interface PumpControlCardProps {
  tank: Tank;
  onUpdateTank: (updated: Partial<Tank>) => void;
}

export const PumpControlCard: React.FC<PumpControlCardProps> = ({
  tank,
  onUpdateTank,
}) => {
  const isPumpOn = tank.pumpStatus === 'pumping_in';
  const isAuto = tank.pumpMode === 'auto';

  const togglePumpPower = () => {
    soundManager.playBuzzer(isPumpOn ? 'click' : 'pump_start');
    const nextStatus = isPumpOn ? 'idle' : 'pumping_in';
    onUpdateTank({
      pumpStatus: nextStatus,
    });
  };

  const toggleMode = (mode: 'auto' | 'manual') => {
    soundManager.playBuzzer('click');
    onUpdateTank({ pumpMode: mode });
  };

  // Simulated pump electrical metrics
  const pumpWatts = isPumpOn ? 750 : 0;
  const pumpAmps = isPumpOn ? 3.4 : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Relay & Pump Control</h3>
            <p className="text-xs text-slate-400">0.75 HP Submersible Relay Switch</p>
          </div>
        </div>

        {/* Auto vs Manual Switch */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => toggleMode('auto')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              isAuto
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto Pilot
          </button>
          <button
            type="button"
            onClick={() => toggleMode('manual')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              !isAuto
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Main Switch Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {/* Big Toggle Button */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Relay Channel 1
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                isPumpOn
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isPumpOn ? 'CLOSED / ENERGIZED' : 'OPEN / DE-ENERGIZED'}
            </span>
          </div>

          <div className="my-4 flex items-center justify-center">
            <button
              type="button"
              disabled={isAuto}
              onClick={togglePumpPower}
              className={`relative group w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                isAuto
                  ? 'opacity-60 cursor-not-allowed bg-slate-800 border-2 border-slate-700 text-slate-400'
                  : isPumpOn
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.5)] scale-105'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-2 border-slate-700'
              }`}
            >
              <Power className={`w-8 h-8 ${isPumpOn ? 'text-slate-950' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold mt-1 uppercase">
                {isPumpOn ? 'PUMP ON' : 'PUMP OFF'}
              </span>
            </button>
          </div>

          {isAuto ? (
            <p className="text-[11px] text-center text-amber-400/90 bg-amber-500/10 py-1 px-2 rounded border border-amber-500/20">
              Auto Pilot is controlling pump: refuels at ≤{tank.lowThresholdPct}% and halts at ≥{tank.highThresholdPct}%.
            </p>
          ) : (
            <p className="text-[11px] text-center text-slate-400">
              Manual Override engaged. Toggle button directly triggers the 5V relay.
            </p>
          )}
        </div>

        {/* Pump Electric & Sensor Telemetry */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold">
              <Cpu className="w-4 h-4 text-cyan-400" /> Motor Telemetry
            </span>
            <span className="font-mono text-emerald-400 text-xs">230V AC Single Phase</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Power</span>
              <p className="text-lg font-mono font-bold text-white">{pumpWatts} W</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Current</span>
              <p className="text-lg font-mono font-bold text-cyan-300">{pumpAmps} A</p>
            </div>
          </div>

          {/* Dry Run Protection status */}
          <div className="flex items-center gap-2 text-xs bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold text-slate-200">Dry Run Lockout: </span>
              <span className="text-emerald-400 font-semibold">Armed &amp; Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Rate Tuning & Outflow Simulator */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inflow Rate Control */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Pump Inlet Delivery Rate
            </span>
            <span className="font-mono text-cyan-400 font-bold">{tank.inflowRateLpm} L/min</span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            step="5"
            value={tank.inflowRateLpm}
            onChange={(e) => onUpdateTank({ inflowRateLpm: Number(e.target.value) })}
            className="accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[10px] text-slate-500">Flow rate into tank when pump relay is active</span>
        </div>

        {/* Outflow Rate / Consumer Usage Simulator */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Tap Discharge / Usage Rate
            </span>
            <span className="font-mono text-amber-400 font-bold">{tank.outflowRateLpm} L/min</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="2"
            value={tank.outflowRateLpm}
            onChange={(e) => onUpdateTank({ outflowRateLpm: Number(e.target.value) })}
            className="accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[10px] text-slate-500">Simulate household faucets, gardening or irrigation drainage</span>
        </div>
      </div>
    </div>
  );
};
