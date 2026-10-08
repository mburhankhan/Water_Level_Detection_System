import React from 'react';
import { Bell, Radio, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_ALERT_PROFILES } from '../data/mock';

export const AlertsPage: React.FC = () => {
  const { userRecord } = useAuth();
  const currentProfileId = userRecord?.profileId || 'prof-all';
  const profile = MOCK_ALERT_PROFILES[currentProfileId] || Object.values(MOCK_ALERT_PROFILES)[0];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Alert Profiles &amp; Ntfy</h2>
            <p className="text-xs text-slate-400">Push notification preferences</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-sky-300">Milestone 1 Shell Ready</p>
          <p>
            Current Active Profile: <strong className="text-white">{profile.name}</strong> (Topic: <code className="text-sky-300 font-mono">{profile.ntfyTopic}</code>)
          </p>
          <p className="text-slate-400">
            In Milestone 3 (M3), this screen will feature selectable radio cards for alert profiles, one-tap Ntfy deep link subscription buttons (<code>ntfy://</code> and web fallback), topic copier, and step-by-step setup guide.
          </p>
        </div>
      </div>
    </div>
  );
};
