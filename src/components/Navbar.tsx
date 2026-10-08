import React from 'react';
import {
  Waves,
  Terminal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FastForward,
  PowerOff,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { soundManager } from '../utils/audioAlert';

export type NavTab = 'dashboard' | 'multi_tank' | 'telemetry' | 'automation' | 'firmware';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSerialMonitor: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  simSpeed: number; // 0 = paused, 1 = normal, 5 = fast
  onChangeSimSpeed: (speed: number) => void;
  onEmergencyStop: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSerialMonitor,
  isMuted,
  onToggleMute,
  simSpeed,
  onChangeSimSpeed,
  onEmergencyStop,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">AquaSense IoT</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  V2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Water Level Detection &amp; Automated Pump System
              </p>
            </div>
          </div>

          {/* Controls: Mute, Sim Speed, Serial Monitor, Emergency Cutoff */}
          <div className="flex items-center gap-2">
            {/* Simulation Speed Pill */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeSimSpeed(simSpeed === 0 ? 1 : 0)}
                className={`p-1.5 rounded-md transition-all ${
                  simSpeed === 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
                title={simSpeed === 0 ? 'Resume simulation' : 'Pause simulation'}
              >
                {simSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onChangeSimSpeed(1)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all ${
                  simSpeed === 1 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => onChangeSimSpeed(5)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-0.5 ${
                  simSpeed === 5 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FastForward className="w-3 h-3" /> 5x
              </button>
            </div>

            {/* Audio Alarm Sound Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2 rounded-lg border text-xs transition-all ${
                isMuted
                  ? 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              }`}
              title={isMuted ? 'Unmute Audio Buzzer Alarm' : 'Mute Audio Buzzer'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Serial Monitor Button */}
            <button
              type="button"
              onClick={onOpenSerialMonitor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Serial Monitor</span>
            </button>

            {/* Emergency E-Stop Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBuzzer('alarm');
                onEmergencyStop();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              title="Instantly de-energize all pump relays"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">E-STOP</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 py-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Tank Dashboard', icon: Waves },
            { id: 'multi_tank', label: 'Multi-Tank Grid', icon: Radio },
            { id: 'telemetry', label: 'Telemetry & Charts', icon: SlidersHorizontal },
            { id: 'automation', label: 'Automation Rules', icon: SlidersHorizontal },
            { id: 'firmware', label: 'Firmware & Pinout', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundManager.playBuzzer('click');
                  onSelectTab(tab.id as NavTab);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
