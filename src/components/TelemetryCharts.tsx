import React from 'react';
import { TelemetryPoint, Tank } from '../types';
import { LineChart, Download, History, Database, Clock } from 'lucide-react';

interface TelemetryChartsProps {
  tank: Tank;
  history: TelemetryPoint[];
  onClearHistory: () => void;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  tank,
  history,
  onClearHistory,
}) => {
  // SVG Chart Dimensions
  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 25, left: 40 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Build SVG path
  const points = history.slice(-25); // show last 25 readings
  let pathD = '';
  if (points.length > 1) {
    const coords = points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - (Math.min(100, Math.max(0, p.levelPct)) / 100) * plotHeight;
      return `${x},${y}`;
    });
    pathD = `M ${coords.join(' L ')}`;
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Level_Pct', 'Distance_Cm', 'Volume_Liters', 'Pump_Active'];
    const rows = history.map((h) => [
      h.timestamp,
      h.levelPct.toFixed(1),
      h.distanceCm.toFixed(1),
      h.volumeLiters.toFixed(0),
      h.pumpActive ? 'YES' : 'NO',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aquasense_telemetry_${tank.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Real-time Telemetry Trend</h3>
            <p className="text-xs text-slate-400">Time-series ultrasonic liquid level measurements</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold transition-all shadow"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={onClearHistory}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg text-xs transition-all"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="mt-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />
          <text x={padding.left - 8} y={padding.top + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
            100%
          </text>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight * 0.5}
            x2={width - padding.right}
            y2={padding.top + plotHeight * 0.5}
            stroke="#334155"
            strokeDasharray="4 4"
            strokeWidth="0.8"
          />
          <text x={padding.left - 8} y={padding.top + plotHeight * 0.5 + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
            50%
          </text>

          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke="#334155"
            strokeWidth="1"
          />
          <text x={padding.left - 8} y={padding.top + plotHeight + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
            0%
          </text>

          {/* Cutoff Reference Line */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight - (tank.highThresholdPct / 100) * plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight - (tank.highThresholdPct / 100) * plotHeight}
            stroke="#38bdf8"
            strokeDasharray="2 2"
            strokeWidth="1.2"
            opacity="0.7"
          />

          {/* Refill Reference Line */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight - (tank.lowThresholdPct / 100) * plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight - (tank.lowThresholdPct / 100) * plotHeight}
            stroke="#fbbf24"
            strokeDasharray="2 2"
            strokeWidth="1.2"
            opacity="0.7"
          />

          {/* The Data Path Line */}
          {pathD ? (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Highlight dot on newest point */}
              {points.length > 0 && (
                <circle
                  cx={padding.left + plotWidth}
                  cy={padding.top + plotHeight - (Math.min(100, Math.max(0, points[points.length - 1].levelPct)) / 100) * plotHeight}
                  r="4"
                  fill="#2dd4bf"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </>
          ) : (
            <text x={width / 2} y={height / 2} fill="#64748b" fontSize="12" textAnchor="middle">
              Gathering live telemetry points...
            </text>
          )}
        </svg>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-3 border-t border-slate-800/60 pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-teal-400 inline-block" /> Live Level %
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-sky-400 border-dashed inline-block" /> Auto Cutoff ({tank.highThresholdPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 border-dashed inline-block" /> Auto Refill ({tank.lowThresholdPct}%)
            </span>
          </div>
          <span className="font-mono text-slate-400">{points.length} samples collected</span>
        </div>
      </div>

      {/* Mini Recent Telemetry Table */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Recent Sensor Snapshots
          </h4>
        </div>
        <div className="overflow-x-auto max-h-40 rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Liquid Level</th>
                <th className="py-2 px-3">Sensor Gap</th>
                <th className="py-2 px-3">Volume</th>
                <th className="py-2 px-3">Relay State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.slice(-8).reverse().map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-1.5 px-3 text-slate-400">{entry.timestamp}</td>
                  <td className="py-1.5 px-3 text-teal-300 font-bold">{entry.levelPct.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-cyan-300">{entry.distanceCm.toFixed(1)} cm</td>
                  <td className="py-1.5 px-3">{entry.volumeLiters.toFixed(0)} L</td>
                  <td className="py-1.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        entry.pumpActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {entry.pumpActive ? 'ON' : 'OFF'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
