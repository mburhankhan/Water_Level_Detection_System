import React from 'react';
import { Tank } from '../types';
import { Thermometer, Activity, Wifi, Radio, Sliders, CheckCircle2 } from 'lucide-react';

interface SensorTelemetryCardProps {
  tank: Tank;
}

export const SensorTelemetryCard: React.FC<SensorTelemetryCardProps> = ({ tank }) => {
  const currentLevel = tank.currentLevelPct;
  const distanceCm = ((100 - currentLevel) / 100 * tank.totalHeightCm + 10);
  const echoDurationUs = Math.round((distanceCm * 2) / 0.0343);

  // Status of hardware LED indicators
  const isRedLed = currentLevel >= tank.criticalOverflowPct || currentLevel <= tank.criticalLowPct;
  const isYellowLed = !isRedLed && currentLevel <= tank.lowThresholdPct;
  const isGreenLed = !isRedLed && !isYellowLed;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Sensor Telemetry &amp; Microcontroller</h3>
            <p className="text-xs text-slate-400">HC-SR04 &bull; DS18B20 &bull; NodeMCU ESP8266</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>CONNECTED (115200 BAUD)</span>
        </div>
      </div>

      {/* Grid of Microcontroller & Sensor metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Metric: Echo Flight Time */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Pulse Echo Time
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-cyan-300">{echoDurationUs}</span>
            <span className="text-xs text-slate-400 font-mono">&mu;s</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Ultrasonic flight</span>
        </div>

        {/* Metric: Water Temperature */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-rose-400" /> Temperature
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-slate-200">{tank.temperatureC.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-mono">&deg;C</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">DS18B20 Probe</span>
        </div>

        {/* Metric: Turbidity / Clarity */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Turbidity / Clarity
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-emerald-300">{tank.turbidityNTU.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-mono">NTU</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 block font-medium">Clear / Potable</span>
        </div>

        {/* Metric: Wi-Fi RSSI */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block flex items-center gap-1">
            <Wifi className="w-3 h-3 text-sky-400" /> Wi-Fi RSSI
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-sky-300">-64</span>
            <span className="text-xs text-slate-400 font-mono">dBm</span>
          </div>
          <span className="text-[10px] text-sky-400/80 mt-1 block font-medium">98% Signal</span>
        </div>
      </div>

      {/* Hardware Multi-stage LED & Buzzer Simulator panel */}
      <div className="mt-4 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-semibold">Physical PCB Status LEDs:</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Green LED */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full border ${
                isGreenLed
                  ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_12px_#34d399]'
                  : 'bg-emerald-950 border-emerald-900 opacity-40'
              }`}
            />
            <span className="text-xs font-mono font-semibold text-slate-300">GREEN (NORMAL)</span>
          </div>

          {/* Yellow LED */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full border ${
                isYellowLed
                  ? 'bg-amber-400 border-amber-300 shadow-[0_0_12px_#fbbf24]'
                  : 'bg-amber-950 border-amber-900 opacity-40'
              }`}
            />
            <span className="text-xs font-mono font-semibold text-slate-300">YELLOW (REFILL)</span>
          </div>

          {/* Red LED */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-3.5 h-3.5 rounded-full border ${
                isRedLed
                  ? 'bg-red-500 border-red-400 shadow-[0_0_12px_#ef4444] animate-pulse'
                  : 'bg-red-950 border-red-900 opacity-40'
              }`}
            />
            <span className="text-xs font-mono font-semibold text-slate-300">RED (ALARM)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
