import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Smartphone,
  HelpCircle,
  Clock,
  Radio,
  CheckCircle2,
  VolumeX,
} from 'lucide-react';
import { AlertProfile } from '../types';
import { MOCK_ALERT_PROFILES } from '../data/mock';
import { isDemoMode, rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { DEFAULT_NTFY_BASE_URL } from '../config/constants';

export const AlertsPage: React.FC = () => {
  const { userRecord, updateUserProfileId } = useAuth();
  const [profiles, setProfiles] = useState<AlertProfile[]>(Object.values(MOCK_ALERT_PROFILES));
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const selectedProfileId = userRecord?.profileId || 'prof-all';

  // Load real alert profiles from /alertProfiles in real mode
  useEffect(() => {
    if (isDemoMode) {
      setProfiles(Object.values(MOCK_ALERT_PROFILES).sort((a, b) => a.order - b.order));
      return;
    }

    if (!rtdb) return;

    const profilesRef = ref(rtdb, 'alertProfiles');
    const unsub = onValue(profilesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, Omit<AlertProfile, 'id'>>;
        const list: AlertProfile[] = Object.entries(val).map(([id, p]) => ({
          ...p,
          id,
        }));
        list.sort((a, b) => a.order - b.order);
        setProfiles(list);
      }
    });

    return () => unsub();
  }, []);

  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0] || MOCK_ALERT_PROFILES['prof-all'];

  const ntfyBaseUrl = (import.meta.env.VITE_NTFY_BASE_URL as string) || DEFAULT_NTFY_BASE_URL;
  const ntfyHost = ntfyBaseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const ntfyDeepLink = `ntfy://${ntfyHost}/${activeProfile?.ntfyTopic}`;
  const ntfyHttpsLink = `${ntfyBaseUrl.replace(/\/+$/, '')}/${activeProfile?.ntfyTopic}`;
  const ntfyWebAppUrl = `${ntfyBaseUrl.replace(/\/+$/, '')}/app`;

  const handleSelectProfile = async (profileId: string) => {
    try {
      setSaving(true);
      await updateUserProfileId(profileId);
    } catch (err) {
      console.error('[Error selecting profile]', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTopic = () => {
    if (!activeProfile?.ntfyTopic) return;
    navigator.clipboard.writeText(activeProfile.ntfyTopic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribeClick = () => {
    // Attempt opening native ntfy:// URL, fallback to HTTPS tab after brief timeout
    const start = Date.now();
    window.location.href = ntfyDeepLink;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(ntfyHttpsLink, '_blank', 'noopener,noreferrer');
      }
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Notification Alerts</h1>
            <p className="text-xs text-slate-400">Push notifications via Ntfy</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mt-2">
          Select an alert profile below to match your household schedule. Water Monitor publishes push notifications to your private topic.
        </p>
      </div>

      {/* Alert Profile Radio Cards */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block px-1">
          Select Your Alert Profile
        </label>

        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const rateLimitStr = profile.maxPerHour === 0 ? 'Unlimited alerts' : `Max ${profile.maxPerHour}/hr`;
          const reminderStr =
            profile.reminderIntervalMin === 0
              ? 'No reminders'
              : `Remind every ${profile.reminderIntervalMin}m`;

          return (
            <div
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/95 border-sky-500 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Custom Radio Icon */}
                  <div className="mt-0.5">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {profile.name}
                      {isSelected && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                      <span>{rateLimitStr}</span>
                      <span>&bull;</span>
                      <span>{reminderStr}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert Event Types Pills */}
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-1.5 text-[10px]">
                {profile.types.available && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    &bull; Water Available
                  </span>
                )}
                {profile.types.finished && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    &bull; Supply Finished
                  </span>
                )}
                {profile.types.reminder && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    &bull; Ongoing Reminders
                  </span>
                )}
                {profile.types.offline && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    &bull; Pipeline Offline
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscription Action Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
            Your Notification Topic
          </span>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-sky-300 font-semibold truncate select-all">
              {activeProfile.ntfyTopic}
            </span>
            <button
              type="button"
              onClick={handleCopyTopic}
              className="min-h-[44px] px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
              title="Copy topic name"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Button 1: Deep link to ntfy app */}
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-semibold text-xs transition-all shadow-md shadow-sky-600/20"
          >
            <Smartphone className="w-4 h-4" />
            <span>Subscribe in ntfy app</span>
          </button>

          {/* Button 2: Open ntfy in browser (PWA web app with background push) */}
          <a
            href={ntfyWebAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-sky-400" />
            <span>Open ntfy in browser</span>
          </a>
        </div>

        {/* Notice for web app */}
        <p className="text-[11px] text-slate-400 text-center">
          Tap <strong>Install app</strong>, then subscribe to your topic.
        </p>

        {/* 3-Step Setup Instructions */}
        <div className="pt-4 border-t border-slate-700/60 space-y-2.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            3-Step Push Notification Setup:
          </span>
          <ol className="text-xs text-slate-400 space-y-1.5 pl-5 list-decimal">
            <li>
              Install the free <strong>ntfy app</strong> from Google Play / App Store, or use the installable ntfy web app.
            </li>
            <li>
              Tap <strong>Subscribe in ntfy app</strong> (or paste the topic: <code className="text-sky-300 font-mono">{activeProfile.ntfyTopic}</code>).
            </li>
            <li>
              Allow notifications in your device settings.
            </li>
          </ol>
        </div>

        {/* Quiet hours & Snooze help note */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-400">
          <VolumeX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Quiet hours &amp; snooze:</strong> Scheduled quiet hours and muting are managed through your phone's <em>Do Not Disturb</em> mode or ntfy's mute toggle.
          </p>
        </div>
      </div>
    </div>
  );
};
