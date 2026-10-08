import React from 'react';
import { AlertNotification } from '../types';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AlertBannerProps {
  alerts: AlertNotification[];
  onDismiss: (id: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'critical';
        const isWarning = alert.severity === 'warning';

        return (
          <div
            key={alert.id}
            className={`flex items-start justify-between p-3.5 rounded-xl border backdrop-blur-md transition-all ${
              isCritical
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                : isWarning
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {isCritical ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                ) : isWarning ? (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wide">
                    {alert.title}
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    [{alert.tankName}] &bull; {alert.timestamp}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="opacity-60 hover:opacity-100 p-1 rounded-lg text-sm font-bold ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
