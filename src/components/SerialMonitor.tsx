import React, { useState, useEffect, useRef } from 'react';
import { Tank } from '../types';
import { Terminal, Send, Trash2, Pause, Play, Download } from 'lucide-react';

interface SerialMonitorProps {
  tank: Tank;
  isOpen: boolean;
  onClose: () => void;
  onSendCommand?: (cmd: string) => void;
}

export const SerialMonitor: React.FC<SerialMonitorProps> = ({
  tank,
  isOpen,
  onClose,
  onSendCommand,
}) => {
  const [logs, setLogs] = useState<string[]>([
    '[INIT] NodeMCU ESP8266 Booting...',
    '[INIT] Flash size: 4MB | CPU: 80MHz',
    '[INIT] Initializing HC-SR04 Ultrasonic Driver...',
    '[OK] Sensors operational. Starting loop().',
  ]);
  const [isPaused, setIsPaused] = useState(false);
  const [inputCmd, setInputCmd] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto add simulated serial telemetry tick
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      const now = new Date().toTimeString().split(' ')[0];
      const distance = (tank.totalHeightCm - (tank.currentLevelPct / 100) * tank.totalHeightCm + 10).toFixed(1);
      const depth = ((tank.currentLevelPct / 100) * tank.totalHeightCm).toFixed(1);
      const isPump = tank.pumpStatus === 'pumping_in' ? 'ON' : 'OFF';

      const line = `[${now}] DATA,dist:${distance}cm,depth:${depth}cm,pct:${tank.currentLevelPct.toFixed(1)}%,vol:${Math.round(
        (tank.currentLevelPct / 100) * tank.capacityLiters
      )}L,pump:${isPump}`;

      setLogs((prev) => [...prev.slice(-100), line]);
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, tank]);

  // Scroll to bottom
  useEffect(() => {
    if (!isPaused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;

    const cmd = inputCmd.trim();
    const now = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [...prev, `[${now}] [TX] >> ${cmd}`]);

    if (onSendCommand) {
      onSendCommand(cmd);
    }

    // Simulated responses
    setTimeout(() => {
      let resp = `[${now}] [RX] OK: Command acknowledged.`;
      if (cmd.toUpperCase() === 'AT+STATUS') {
        resp = `[${now}] [RX] STATUS: LEVEL=${tank.currentLevelPct.toFixed(1)}% PUMP=${tank.pumpStatus} RSSI=-64dBm`;
      } else if (cmd.toUpperCase() === 'RELAY=ON') {
        resp = `[${now}] [RX] RELAY_1: ENERGIZED (HIGH)`;
      } else if (cmd.toUpperCase() === 'RELAY=OFF') {
        resp = `[${now}] [RX] RELAY_1: DE-ENERGIZED (LOW)`;
      } else if (cmd.toUpperCase() === 'AT+PING') {
        resp = `[${now}] [RX] PONG (Latency: 14ms)`;
      }
      setLogs((prev) => [...prev, resp]);
    }, 200);

    setInputCmd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">UART Serial Monitor (COM4 / /dev/ttyUSB0)</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              115200 8N1
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              title="Clear terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Console logs body */}
        <div className="flex-1 bg-black p-3.5 overflow-y-auto font-mono text-xs space-y-1 select-text">
          {logs.map((log, index) => {
            const isTx = log.includes('[TX]');
            const isWarn = log.includes('[WARN]') || log.includes('OVERFLOW');
            return (
              <div
                key={index}
                className={
                  isTx
                    ? 'text-cyan-300 font-bold'
                    : isWarn
                    ? 'text-rose-400 font-bold'
                    : 'text-emerald-400/90'
                }
              >
                {log}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* Input command send bar */}
        <form onSubmit={handleSend} className="bg-slate-950 p-3 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            placeholder="Type command (e.g. AT+STATUS, AT+PING, RELAY=ON)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
};
