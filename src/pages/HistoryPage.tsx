import React from 'react';
import { History, Calendar } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';

export const HistoryPage: React.FC = () => {
  const { currentDevice, periods } = useDevice();

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Water Availability History</h2>
            <p className="text-xs text-slate-400">{currentDevice?.meta.name || 'Pipeline'}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-sky-300">Milestone 1 Shell Ready</p>
          <p>
            {periods.length} availability periods cached in data model. In Milestone 2 (M2), this view will render the range chips (7 / 30 / 90 days), 24-hour daily timeline chart, daily total hours bar chart, CSV export, and period list.
          </p>
        </div>
      </div>
    </div>
  );
};
