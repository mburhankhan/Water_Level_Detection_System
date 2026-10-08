import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { useTheme } from '../context/ThemeContext';
import {
  Settings,
  User,
  Globe,
  Clock,
  Sun,
  Moon,
  Laptop,
  Lock,
  LogOut,
  Sliders,
  CheckCircle2,
  Clock4,
  RotateCcw,
  AlertCircle,
  Save,
  X,
  Shield,
  HelpCircle,
  Users,
  Bell,
  Cpu,
} from 'lucide-react';
import {
  SETTINGS_SCHEMA,
  getSettingsByScope,
  getDefaultSettings,
  validateSettingValue,
  SettingDefinition,
} from '../config/settingsSchema';
import { auth, rtdb, isDemoMode } from '../lib/firebase';
import { getFriendlyErrorMessage } from '../lib/errorUtils';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { DEFAULT_TIMEZONE } from '../config/constants';
import { PWAInstallButton } from '../components/PWAInstallButton';

const AdminUsersPanel = React.lazy(() =>
  import('../components/admin/AdminUsersPanel').then((m) => ({ default: m.AdminUsersPanel }))
);
const AdminAlertProfilesPanel = React.lazy(() =>
  import('../components/admin/AdminAlertProfilesPanel').then((m) => ({ default: m.AdminAlertProfilesPanel }))
);
const AdminDevicesPanel = React.lazy(() =>
  import('../components/admin/AdminDevicesPanel').then((m) => ({ default: m.AdminDevicesPanel }))
);

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST, UTC+6)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, UTC+3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
];

export const SettingsPage: React.FC = () => {
  const { userRecord, role, isAdmin, signOut, updateUserPrefs, isDemo, switchDemoUser } = useAuth();
  const { currentDevice, devices } = useDevice();
  const { theme, setTheme } = useTheme();

  // Navigation tab state for Admin vs Personal Preferences
  const [mainTab, setMainTab] = useState<'preferences' | 'admin'>(isAdmin ? 'admin' : 'preferences');
  const [adminTab, setAdminTab] = useState<'users' | 'profiles' | 'devices' | 'tunables'>('users');

  // General Settings state
  const timeZone = userRecord?.prefs?.timeZone || DEFAULT_TIMEZONE;
  const use24h = Boolean(userRecord?.prefs?.use24h);

  // Account Password Change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // Device Schema Settings state (admin only)
  const pipelineSchema = getSettingsByScope('pipeline');
  const initialValues = currentDevice?.settings?.values || getDefaultSettings('pipeline');
  const [settingValues, setSettingValues] = useState<Record<string, string | number | boolean>>(
    initialValues as Record<string, string | number | boolean>
  );
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check synchronization state: Pending vs Applied by device
  const settingsVersion = currentDevice?.settings?.version || 0;
  const appliedVersion = currentDevice?.status?.appliedSettingsVersion || 0;
  const isPending = appliedVersion < settingsVersion;

  // Handle setting value change
  const handleSettingChange = (id: string, val: string | number | boolean) => {
    setSettingValues((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  // Reset to schema defaults
  const handleResetToDefault = () => {
    const defaults = getDefaultSettings('pipeline');
    setSettingValues(defaults);
  };

  // Compute changed settings
  const changedSettings = pipelineSchema.filter((def) => {
    const orig = currentDevice?.settings?.values?.[def.id] ?? def.default;
    return settingValues[def.id] !== orig;
  });

  // Save device settings
  const handleSaveDeviceSettings = async () => {
    if (!currentDevice) return;
    setSaveLoading(true);
    const nextVersion = settingsVersion + 1;
    const nowEpoch = Date.now();

    try {
      if (isDemoMode) {
        // Update in memory for current device
        currentDevice.settings = {
          version: nextVersion,
          updatedAt: nowEpoch,
          values: { ...settingValues },
        };
        // In demo mode: simulate device picking it up after 3 seconds
        setTimeout(() => {
          if (currentDevice.status) {
            currentDevice.status.appliedSettingsVersion = nextVersion;
          }
        }, 3000);
      } else if (rtdb) {
        // Multi-path atomic update
        const updates: Record<string, unknown> = {
          [`devices/${currentDevice.id}/settings/version`]: nextVersion,
          [`devices/${currentDevice.id}/settings/updatedAt`]: nowEpoch,
          [`devices/${currentDevice.id}/settings/values`]: settingValues,
        };
        await update(ref(rtdb), updates);
      }

      setShowConfirmSheet(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('[Error saving settings]', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle password update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (newPass.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassLoading(true);
    try {
      if (isDemoMode) {
        // Simulated success
        await new Promise((r) => setTimeout(r, 600));
        setPassSuccess('Password updated successfully (Demo Mode simulated).');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else if (auth && auth.currentUser && auth.currentUser.email) {
        // Re-authenticate
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
        await reauthenticateWithCredential(auth.currentUser, credential);
        // Update password
        await updatePassword(auth.currentUser, newPass);
        setPassSuccess('Password updated successfully.');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      }
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to update password. Verify current password.');
      setPassError(msg);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Admin / Personal Segmented Switcher for Administrator */}
      {isAdmin && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 grid grid-cols-2 gap-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => setMainTab('admin')}
            className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'admin'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Console</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('preferences')}
            className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'preferences'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>My Preferences</span>
          </button>
        </div>
      )}

      {/* ADMIN CONSOLE VIEW */}
      {isAdmin && mainTab === 'admin' && (
        <div className="space-y-4">
          {/* Sub-tabs for Admin Console */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
            {[
              { id: 'users', label: 'Users', icon: Users },
              { id: 'profiles', label: 'Alert Profiles', icon: Bell },
              { id: 'devices', label: 'Devices', icon: Cpu },
              { id: 'tunables', label: 'Pipeline Config', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = adminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminTab(tab.id as 'users' | 'profiles' | 'devices' | 'tunables')}
                  className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500 font-bold'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Render Active Admin Panel with Suspense */}
          <React.Suspense
            fallback={
              <div className="p-8 text-center bg-slate-800/80 rounded-2xl border border-slate-700/80 text-slate-400">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs font-mono">Loading management module...</span>
              </div>
            }
          >
            {adminTab === 'users' && <AdminUsersPanel />}
            {adminTab === 'profiles' && <AdminAlertProfilesPanel />}
            {adminTab === 'devices' && <AdminDevicesPanel />}
          </React.Suspense>
          {adminTab === 'tunables' && (
            <>
              {currentDevice ? (
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          Pipeline Settings
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Admin
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400">{currentDevice.meta.name}</p>
                      </div>
                    </div>

                    {/* Sync State Badge: Pending vs Applied */}
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock4 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pending sync (v{settingsVersion})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Applied by device (v{appliedVersion})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {saveSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Settings saved! New version v{settingsVersion + 1} queued for device.</span>
                    </div>
                  )}

                  {/* Form fields generated from SETTINGS_SCHEMA */}
                  <div className="space-y-4">
                    {pipelineSchema.map((def: SettingDefinition) => {
                      const currentVal = settingValues[def.id] ?? def.default;

                      return (
                        <div key={def.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <label className="text-xs font-bold text-white block">
                                {def.label}
                              </label>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                {def.help}
                              </p>
                            </div>

                            {def.type === 'number' && (
                              <span className="font-mono text-xs font-bold text-sky-400 shrink-0 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                {String(currentVal)} {def.unit || ''}
                              </span>
                            )}
                          </div>

                          {def.type === 'number' && (
                            <div className="flex items-center gap-3 pt-1">
                              <input
                                type="range"
                                min={def.min}
                                max={def.max}
                                step={def.step || 1}
                                value={Number(currentVal)}
                                onChange={(e) => handleSettingChange(def.id, Number(e.target.value))}
                                className="flex-1 accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                              />
                              <input
                                type="number"
                                min={def.min}
                                max={def.max}
                                step={def.step || 1}
                                value={Number(currentVal)}
                                onChange={(e) => handleSettingChange(def.id, Number(e.target.value))}
                                className="w-20 min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg px-2 text-center text-xs text-white font-mono"
                              />
                            </div>
                          )}

                          {def.type === 'radio' && def.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {def.options.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleSettingChange(def.id, opt.value)}
                                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all ${
                                    currentVal === opt.value
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500 font-bold'
                                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {def.type === 'boolean' && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => handleSettingChange(def.id, !currentVal)}
                                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                  currentVal
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                }`}
                              >
                                {currentVal ? 'Enabled' : 'Disabled'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Row */}
                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset to Defaults</span>
                    </button>

                    <button
                      type="button"
                      disabled={changedSettings.length === 0}
                      onClick={() => setShowConfirmSheet(true)}
                      className="min-h-[44px] flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 disabled:opacity-40"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes ({changedSettings.length})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 text-center text-xs text-slate-400">
                  No active pipeline device selected. Provision a device first in Devices tab.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PERSONAL PREFERENCES VIEW (Shown for standard users OR when admin switches to My Preferences) */}
      {(!isAdmin || mainTab === 'preferences') && (
        <div className="space-y-4">
          {/* 1. General Preferences Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">General Preferences</h2>
                <p className="text-xs text-slate-400">Display, clock, and timezone formatting</p>
              </div>
            </div>

            {/* Time Zone Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Display Time Zone
              </label>
              <select
                value={timeZone}
                onChange={(e) => updateUserPrefs({ timeZone: e.target.value })}
                className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                All database timestamps are stored in UTC; displays format to this zone.
              </span>
            </div>

            {/* 12h / 24h Clock Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Time Format
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => updateUserPrefs({ use24h: false })}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all ${
                    !use24h
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  12-Hour (06:40 PM)
                </button>
                <button
                  type="button"
                  onClick={() => updateUserPrefs({ use24h: true })}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all ${
                    use24h
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  24-Hour (18:40)
                </button>
              </div>
            </div>

            {/* Theme Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Interface Theme
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                {[
                  { id: 'system', label: 'System', icon: Laptop },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id as 'system' | 'light' | 'dark');
                        updateUserPrefs({ theme: t.id as 'system' | 'light' | 'dark' });
                      }}
                      className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PWA App Installation Option */}
            <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="block text-xs font-semibold text-slate-200">Mobile App Installation</span>
                <span className="text-[11px] text-slate-400">Install to your device home screen for quick offline access</span>
              </div>
              <PWAInstallButton />
            </div>
          </div>

          {/* 2. Assigned Devices Card (Users can see their assigned devices) */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Assigned Sensor Feeds</h2>
                <p className="text-xs text-slate-400">
                  {devices.length} device{devices.length === 1 ? '' : 's'} assigned to your account
                </p>
              </div>
            </div>

            {devices.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">
                No pipeline feeds are currently assigned to your account. Contact the administrator to grant access.
              </p>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-white">{d.meta.name}</h3>
                      <p className="text-[10px] font-mono text-slate-400">ID: {d.id}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        d.status.state === 'AVAILABLE'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : d.status.state === 'FINISHED'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {d.status.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Account & Security Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Account &amp; Security</h2>
                <p className="text-xs text-slate-400">{userRecord?.email}</p>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3">
              <span className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                Change Password
              </span>

              {passError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passLoading || !currentPass || !newPass}
                className="w-full min-h-[44px] rounded-xl bg-slate-700 hover:bg-slate-650 text-white font-semibold text-xs transition-all disabled:opacity-50"
              >
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            {/* Sign Out Action */}
            <div className="pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sheet Modal for Device Schema Changed Values */}
      {showConfirmSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                Confirm Settings Update
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmSheet(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              The following values will be written and version will increment to{' '}
              <strong className="text-white font-mono">v{settingsVersion + 1}</strong>:
            </p>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {changedSettings.map((def) => {
                const orig = currentDevice?.settings?.values?.[def.id] ?? def.default;
                const next = settingValues[def.id];
                return (
                  <div key={def.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-200 block">{def.label}</span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
                      <span className="text-slate-500 line-through">{String(orig)}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="text-sky-400 font-bold">{String(next)}</span>
                      {def.unit && <span className="text-slate-500">{def.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSheet(false)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={handleSaveDeviceSettings}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20"
              >
                {saveLoading ? 'Writing...' : 'Confirm & Write'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Quick Switcher Card */}
      {isDemo && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Demo Identity Switcher
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => switchDemoUser('admin')}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium border text-center transition-all ${
                role === 'admin'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Admin Role (Full)
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('user')}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium border text-center transition-all ${
                role === 'user' && userRecord?.active
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Resident Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
