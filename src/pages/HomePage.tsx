import React from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { Droplet, Clock, Wifi, WifiOff, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { currentDevice, isOnline } = useDevice();
  const { role } = useAuth();

  if (!currentDevice) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>No pipeline devices assigned to your account. Contact an administrator.</p>
      </div>
    );
  }

  const state = currentDevice.status.state;
  const stateColor =
    state === 'AVAILABLE'
      ? 'text-sky-400 bg-sky-500/10 border-sky-500/30'
      : state === 'FINISHED'
      ? 'text-slate-300 bg-slate-800 border-slate-700'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  const StateIcon = state === 'AVAILABLE' ? CheckCircle2 : state === 'FINISHED' ? XCircle : HelpCircle;

  return (
    <div className="space-y-4">
      {/* Primary Status Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {currentDevice.meta.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        {/* Big State Display */}
        <div className="my-6 flex flex-col items-center justify-center text-center">
          <div className={`p-4 rounded-2xl border ${stateColor} mb-3 shadow-lg`}>
            <StateIcon className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">{state}</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            {state === 'AVAILABLE'
              ? 'Water is currently flowing in pipeline'
              : state === 'FINISHED'
              ? 'Water supply has concluded'
              : 'Status indeterminate'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
            <span className="text-slate-400 block mb-0.5">Firmware</span>
            <span className="font-mono text-slate-200 font-semibold">{currentDevice.status.fwVersion}</span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
            <span className="text-slate-400 block mb-0.5">Settings Sync</span>
            <span className="font-mono text-slate-200 font-semibold">
              v{currentDevice.status.appliedSettingsVersion} / v{currentDevice.settings.version}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300 mb-1">M1 Foundation Active</p>
        <p>
          Role: <strong className="text-white capitalize">{role}</strong>. Foundation complete. In M2, the complete 24-hour timeline strip, live duration counter, and today's total available time will be wired.
        </p>
      </div>
    </div>
  );
};
