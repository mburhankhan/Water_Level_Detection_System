import React from 'react';
import { CalendarClock, TrendingUp } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';

export const SchedulePage: React.FC = () => {
  const { currentDevice } = useDevice();

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Supply Schedule &amp; Probability</h2>
            <p className="text-xs text-slate-400">{currentDevice?.meta.name || 'Pipeline'}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-sky-300">Milestone 1 Shell Ready</p>
          <p>
            In Milestone 2 (M2), this view will execute statistical calculations via <code>src/lib/stats.ts</code>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pt-1">
            <li>Per-weekday median start time with interquartile range (IQR)</li>
            <li>Hourly arrival probability distribution (0-100%)</li>
            <li>Plain English summary: "Water usually arrives around 06:40 on weekdays"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
