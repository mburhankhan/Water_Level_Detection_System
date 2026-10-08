import React, { useState, useEffect } from 'react';
import { AlertProfile, UserRecord } from '../../types';
import { MOCK_ALERT_PROFILES, MOCK_USERS } from '../../data/mock';
import { isDemoMode, rtdb } from '../../lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { generateNtfyTopic } from '../../lib/cryptoUtils';
import { getFriendlyErrorMessage } from '../../lib/errorUtils';
import { DEFAULT_NTFY_BASE_URL } from '../../config/constants';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle2,
  Radio,
  X,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const AdminAlertProfilesPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<AlertProfile[]>(Object.values(MOCK_ALERT_PROFILES));
  const [usersMap, setUsersMap] = useState<Record<string, UserRecord>>(isDemoMode ? MOCK_USERS : {});

  // Edit / Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [order, setOrder] = useState(1);
  const [maxPerHour, setMaxPerHour] = useState(0);
  const [reminderIntervalMin, setReminderIntervalMin] = useState(0);
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [types, setTypes] = useState({
    available: true,
    finished: true,
    reminder: false,
    offline: true,
  });
  const [modalError, setModalError] = useState<string | null>(null);

  // Send Test Modal state
  const [testingProfile, setTestingProfile] = useState<AlertProfile | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Delete Alert Profile state
  const [profileToDelete, setProfileToDelete] = useState<AlertProfile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Banner Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setProfiles(Object.values(MOCK_ALERT_PROFILES).sort((a, b) => a.order - b.order));
      setUsersMap(MOCK_USERS);
      return;
    }

    if (!rtdb) return;

    // Load alert profiles
    const profilesRef = ref(rtdb, 'alertProfiles');
    const unsubProfiles = onValue(profilesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, Omit<AlertProfile, 'id'>>;
        const list: AlertProfile[] = Object.entries(val).map(([id, p]) => ({ ...p, id }));
        list.sort((a, b) => a.order - b.order);
        setProfiles(list);
      } else {
        setProfiles([]);
      }
    });

    // Load users to detect profile usage
    const usersRef = ref(rtdb, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsersMap(snap.val() as Record<string, UserRecord>);
      }
    });

    return () => {
      unsubProfiles();
      unsubUsers();
    };
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Check how many users are assigned to each profile
  const getAssignedUserCount = (profileId: string) => {
    return Object.values(usersMap).filter((u) => u.profileId === profileId).length;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProfileId(null);
    setName('');
    setOrder(profiles.length + 1);
    setMaxPerHour(0);
    setReminderIntervalMin(0);
    setNtfyTopic(generateNtfyTopic());
    setTypes({
      available: true,
      finished: true,
      reminder: false,
      offline: true,
    });
    setModalError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: AlertProfile) => {
    setEditingProfileId(p.id);
    setName(p.name);
    setOrder(p.order);
    setMaxPerHour(p.maxPerHour);
    setReminderIntervalMin(p.reminderIntervalMin);
    setNtfyTopic(p.ntfyTopic);
    setTypes({ ...p.types });
    setModalError(null);
    setShowModal(true);
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setModalError('Profile name cannot be empty.');
      return;
    }
    if (!ntfyTopic.trim()) {
      setModalError('Notification topic cannot be empty.');
      return;
    }

    const id = editingProfileId || `prof-${Date.now().toString(36)}`;
    const profileData: Omit<AlertProfile, 'id'> = {
      name: name.trim(),
      order: Number(order) || 1,
      maxPerHour: Number(maxPerHour) || 0,
      reminderIntervalMin: Number(reminderIntervalMin) || 0,
      types,
      ntfyTopic: ntfyTopic.trim(),
    };

    try {
      if (isDemoMode) {
        setProfiles((prev) => {
          const filtered = prev.filter((p) => p.id !== id);
          return [...filtered, { id, ...profileData }].sort((a, b) => a.order - b.order);
        });
      } else if (rtdb) {
        await set(ref(rtdb, `alertProfiles/${id}`), profileData);
      }

      showFeedback('success', `Alert profile "${name}" saved.`);
      setShowModal(false);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to save alert profile.');
      setModalError(msg);
    }
  };

  // Delete profile with active user check
  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;

    const count = getAssignedUserCount(profileToDelete.id);
    if (count > 0) {
      setDeleteError(
        `Cannot delete this alert profile because it is currently assigned to ${count} active user(s). Reassign them first.`
      );
      return;
    }

    try {
      if (isDemoMode) {
        setProfiles((prev) => prev.filter((p) => p.id !== profileToDelete.id));
      } else if (rtdb) {
        await remove(ref(rtdb, `alertProfiles/${profileToDelete.id}`));
      }
      showFeedback('success', `Alert profile "${profileToDelete.name}" removed.`);
      setProfileToDelete(null);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to delete alert profile.');
      setDeleteError(msg);
    }
  };

  // Send test alert to Ntfy
  const handleSendTestAlert = async () => {
    if (!testingProfile) return;
    setSendingTest(true);
    setTestSuccess(false);

    const ntfyBase = (import.meta.env.VITE_NTFY_BASE_URL as string) || DEFAULT_NTFY_BASE_URL;
    const url = `${ntfyBase.replace(/\/+$/, '')}/${testingProfile.ntfyTopic}`;

    try {
      if (!isDemoMode) {
        await fetch(url, {
          method: 'POST',
          body: `[TEST ALERT] Water Monitor test broadcast for profile "${testingProfile.name}".`,
          headers: {
            Title: 'Water Monitor Test',
            Priority: 'high',
            Tags: 'droplet,warning',
          },
        });
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }

      setTestSuccess(true);
      setTimeout(() => {
        setTestingProfile(null);
        setTestSuccess(false);
        showFeedback('success', `Test alert dispatched to topic ${testingProfile.ntfyTopic}.`);
      }, 1500);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to send test push notification.');
      showFeedback('error', msg);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Create Action */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Alert Profiles</h2>
              <p className="text-xs text-slate-400">Manage notification channels and ntfy topics</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      {/* Profiles Cards List */}
      <div className="space-y-3">
        {profiles.map((p) => {
          const userCount = getAssignedUserCount(p.id);

          return (
            <div
              key={p.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                      Order: {p.order}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    <span>Topic:</span>
                    <span className="text-sky-300 font-semibold">{p.ntfyTopic}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Send Test Button */}
                  <button
                    type="button"
                    onClick={() => setTestingProfile(p)}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-900 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="min-h-[38px] p-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs"
                    title="Edit profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileToDelete(p);
                      setDeleteError(null);
                    }}
                    className="min-h-[38px] p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs"
                    title="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Badges & Stats */}
              <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-[11px]">
                  <span>{p.maxPerHour === 0 ? 'Unlimited/hr' : `Max ${p.maxPerHour}/hr`}</span>
                  <span>&bull;</span>
                  <span>{p.reminderIntervalMin === 0 ? 'No reminders' : `${p.reminderIntervalMin}m reminders`}</span>
                </div>

                <span className="text-[11px] font-medium bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700/60 text-slate-300">
                  {userCount} user{userCount === 1 ? '' : 's'} assigned
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-400" />
                {editingProfileId ? 'Edit Alert Profile' : 'Create Alert Profile'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daytime Urgent Only"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Alerts/Hour (0=unlimited)</label>
                  <input
                    type="number"
                    min={0}
                    value={maxPerHour}
                    onChange={(e) => setMaxPerHour(Number(e.target.value))}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reminder Interval (Minutes, 0=off)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={reminderIntervalMin}
                  onChange={(e) => setReminderIntervalMin(Number(e.target.value))}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono"
                />
              </div>

              {/* Ntfy Topic */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Ntfy Topic</label>
                  <button
                    type="button"
                    onClick={() => setNtfyTopic(generateNtfyTopic())}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Generate random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={ntfyTopic}
                  onChange={(e) => setNtfyTopic(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono"
                />
              </div>

              {/* Event types */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Alert Events</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.available}
                      onChange={(e) => setTypes({ ...types, available: e.target.checked })}
                      className="rounded text-sky-500"
                    />
                    <span>Water Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.finished}
                      onChange={(e) => setTypes({ ...types, finished: e.target.checked })}
                      className="rounded text-sky-500"
                    />
                    <span>Supply Finished</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.reminder}
                      onChange={(e) => setTypes({ ...types, reminder: e.target.checked })}
                      className="rounded text-sky-500"
                    />
                    <span>Reminders</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.offline}
                      onChange={(e) => setTypes({ ...types, offline: e.target.checked })}
                      className="rounded text-sky-500"
                    />
                    <span>Pipeline Offline</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Alert Warning Modal */}
      {testingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Broadcast Test Alert</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                You are about to dispatch a real test notification to topic:
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-amber-300 text-center font-bold">
                {testingProfile.ntfyTopic}
              </div>
              <p className="text-slate-400 leading-relaxed">
                <strong>Confirm Warning:</strong> Every resident and device subscribed to this alert profile will immediately receive an alert notification on their phone.
              </p>
            </div>

            {testSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Test broadcast delivered successfully!</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={sendingTest}
                onClick={() => setTestingProfile(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingTest || testSuccess}
                onClick={handleSendTestAlert}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow flex items-center gap-1.5"
              >
                {sendingTest ? 'Sending...' : 'Confirm & Dispatch Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Alert Profile</h3>
            </div>

            {deleteError ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {deleteError}
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Are you sure you want to remove alert profile <strong className="text-white">{profileToDelete.name}</strong>?
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {deleteError ? 'Close' : 'Cancel'}
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  Delete Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
