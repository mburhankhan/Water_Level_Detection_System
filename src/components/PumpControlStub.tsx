import React, { useState } from 'react';
import { Power, ShieldAlert, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Device } from '../types';
import { useAuth } from '../context/AuthContext';
import { ref, push } from 'firebase/database';
import { rtdb, isDemoMode } from '../lib/firebase';

interface PumpControlStubProps {
  device: Device;
}

/**
 * Phase 2 Automated Pump Management Stub
 * Controlled by FEATURE_PUMP in src/config/constants.ts
 * Implements hardware commands conforming to database.rules.json: /devices/{deviceId}/commands
 */
export const PumpControlStub: React.FC<PumpControlStubProps> = ({ device }) => {
  const { currentUser } = useAuth();
  const [pumpMode, setPumpMode] = useState<'AUTO' | 'MANUAL' | 'OFF'>('AUTO');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isPipelineAvailable = device.status.state === 'AVAILABLE';

  const handleTriggerPump = async (action: 'RUN_NOW' | 'STOP') => {
    if (action === 'RUN_NOW' && !isPipelineAvailable) {
      setFeedback('Safety Interlock: Cannot run pump while pipeline water is unavailable.');
      return;
    }

    setFeedback(null);
    const commandPayload = {
      type: action,
      value: { mode: pumpMode, durationMinutes: 15 },
      issuedBy: currentUser?.uid || 'user',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60000, // 60s command validity
    };

    if (!isDemoMode && currentUser && rtdb) {
      try {
        const cmdRef = ref(rtdb, `devices/${device.id}/commands`);
        await push(cmdRef, commandPayload);
      } catch (err) {
        console.warn('[PumpControlStub] RTDB Command write failed:', err);
      }
    }

    setIsRunning(action === 'RUN_NOW');
    setFeedback(action === 'RUN_NOW' ? 'Command RUN_NOW dispatched to ESP32 relay.' : 'Pump stop command dispatched.');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Automated Pump Control</h3>
            <span className="text-[10px] text-slate-400 font-mono">Phase 2 Hardware Relay Module</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Phase 2 Stub
        </span>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['AUTO', 'MANUAL', 'OFF'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPumpMode(mode)}
            className={`min-h-[44px] rounded-xl text-xs font-bold transition-all border ${
              pumpMode === mode
                ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Safety Interlock Status */}
      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            Dry-Run Protection:
          </span>
          {isPipelineAvailable ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Normal (Water Present)
            </span>
          ) : (
            <span className="text-rose-400 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Pipeline Dry (Interlocked)
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Relay State:</span>
          <span className={`font-mono font-bold ${isRunning ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
            {isRunning ? 'RUNNING (Relay ON)' : 'STANDBY (Relay OFF)'}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTriggerPump(isRunning ? 'STOP' : 'RUN_NOW')}
          disabled={!isPipelineAvailable && !isRunning}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-white transition-all ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 active:scale-[0.99]'
              : isPipelineAvailable
              ? 'bg-sky-600 hover:bg-sky-500 active:scale-[0.99]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Power className="w-4 h-4" />
          {isRunning ? 'Stop Pump' : 'Run Pump (15 Min)'}
        </button>
      </div>

      {feedback && (
        <div className="text-[11px] p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
          {feedback}
        </div>
      )}
    </div>
  );
};
