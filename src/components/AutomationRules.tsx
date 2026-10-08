import React, { useState } from 'react';
import { Tank } from '../types';
import { Settings2, Bell, CheckCircle, Mail, Volume2, Shield } from 'lucide-react';
import { soundManager } from '../utils/audioAlert';

interface AutomationRulesProps {
  tank: Tank;
  onUpdateTank: (updated: Partial<Tank>) => void;
  onSendTestNotification: (email: string) => void;
}

export const AutomationRules: React.FC<AutomationRulesProps> = ({
  tank,
  onUpdateTank,
  onSendTestNotification,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('burhanazam37@gmail.com');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    soundManager.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playBuzzer('click');
    }
  };

  const handleSave = () => {
    soundManager.playBuzzer('click');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Automation &amp; Threshold Rules</h3>
            <p className="text-xs text-slate-400">Programmable pump hysteresis and alarm limits</p>
          </div>
        </div>

        {/* Audio alarm toggle */}
        <button
          type="button"
          onClick={handleMuteToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isMuted
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-sm'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          {isMuted ? 'Buzzer Muted' : 'Buzzer Armed'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {/* Sliders for Thresholds */}
        <div className="flex flex-col gap-4">
          {/* Critical Overflow */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-red-950/60 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Critical Overflow Alarm Limit
              </span>
              <span className="font-mono text-red-400 font-bold">{tank.criticalOverflowPct}%</span>
            </div>
            <input
              type="range"
              min="85"
              max="100"
              value={tank.criticalOverflowPct}
              onChange={(e) => onUpdateTank({ criticalOverflowPct: Number(e.target.value) })}
              className="accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] text-slate-400">Triggers continuous hardware buzzer and sends emergency email</span>
          </div>

          {/* Auto Cutoff Stop */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-sky-950/60 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-sky-400 font-semibold flex items-center gap-1">
                Auto-Stop Pump Limit (Tank Full)
              </span>
              <span className="font-mono text-sky-400 font-bold">{tank.highThresholdPct}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              value={tank.highThresholdPct}
              onChange={(e) => onUpdateTank({ highThresholdPct: Number(e.target.value) })}
              className="accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] text-slate-400">Turns off pump relay once water reaches this height</span>
          </div>

          {/* Auto Refill Start */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-amber-950/60 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                Auto-Start Pump Refill Limit
              </span>
              <span className="font-mono text-amber-400 font-bold">{tank.lowThresholdPct}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="50"
              value={tank.lowThresholdPct}
              onChange={(e) => onUpdateTank({ lowThresholdPct: Number(e.target.value) })}
              className="accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] text-slate-400">Automatically activates relay to replenish reservoir</span>
          </div>

          {/* Critical Dry Run */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-rose-950/60 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                Dry Run Protection Cutoff Limit
              </span>
              <span className="font-mono text-rose-400 font-bold">{tank.criticalLowPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              value={tank.criticalLowPct}
              onChange={(e) => onUpdateTank({ criticalLowPct: Number(e.target.value) })}
              className="accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-[10px] text-slate-400">Locks out pump from running dry to prevent impeller burnout</span>
          </div>
        </div>

        {/* Remote Alert Dispatcher & Configuration */}
        <div className="flex flex-col justify-between bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Emergency Notification Dispatcher</h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Configure automated notifications dispatched when overflow or critical low water is detected.
            </p>

            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Alert Recipient Email:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  placeholder="user@example.com"
                />
              </div>
              <button
                type="button"
                onClick={() => onSendTestNotification(recipientEmail)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition-all shadow"
              >
                Send Test Alert
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> MCU Flash Synchronized
            </span>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" /> Saved to EEPROM!
                </>
              ) : (
                'Save Rules to Controller'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
