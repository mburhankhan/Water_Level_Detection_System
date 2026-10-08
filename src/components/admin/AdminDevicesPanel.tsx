import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { Device, DeviceMeta, DeviceStatus, DeviceSettings, UserRecord } from '../../types';
import { MOCK_DEVICES, MOCK_DEVICE_INDEX, MOCK_USERS } from '../../data/mock';
import { isDemoMode, rtdb, getSecondaryAuth } from '../../lib/firebase';
import { ref, set, update, remove, onValue, get } from 'firebase/database';
import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { generateSecurePassword } from '../../lib/cryptoUtils';
import { getFriendlyErrorMessage } from '../../lib/errorUtils';
import { getDefaultSettings } from '../../config/settingsSchema';
import {
  Cpu,
  Plus,
  Trash2,
  Key,
  Copy,
  Check,
  AlertCircle,
  X,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface IncompleteDevice {
  id: string;
  authUid: string;
  name: string;
  type: 'pipeline' | 'pump';
  selectedUserUids: string[];
}

export const AdminDevicesPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { devices } = useDevice();
  const [usersMap, setUsersMap] = useState<Record<string, UserRecord>>(isDemoMode ? MOCK_USERS : {});

  // Add Device Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'pipeline' | 'pump'>('pipeline');
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [devicePassword, setDevicePassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [incompleteDevice, setIncompleteDevice] = useState<IncompleteDevice | null>(null);

  // Delete Device Modal state
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Banner Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setUsersMap(MOCK_USERS);
      return;
    }

    if (!rtdb) return;

    const usersRef = ref(rtdb, 'users');
    const unsub = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsersMap(snap.val() as Record<string, UserRecord>);
      }
    });

    return () => unsub();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenAdd = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setNewDeviceId(`dev-pipe-${randomSuffix}`);
    setNewDeviceName('');
    setNewDeviceType('pipeline');
    setSelectedUserUids(currentUser ? [currentUser.uid] : []);
    setDevicePassword(generateSecurePassword(16));
    setCopiedPassword(false);
    setCreateError(null);
    setIncompleteDevice(null);
    setShowAddModal(true);
  };

  // Add device: 2-step process as required:
  // Step 1: write /devices/{id}/meta FIRST.
  // Step 2: write /deviceIndex/{id}, create device login with secondary app, write /deviceAuth/{authUid}: id, and memberships.
  // If any step after creating login fails, keep incompleteDevice state and show "Finish setup" retry.
  const handleCreateDevice = async () => {
    const rawId = newDeviceId.trim();
    const id = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const name = newDeviceName.trim() || `Pipeline ${id}`;

    if (!id || (!devicePassword && !incompleteDevice)) {
      setCreateError('Device ID and firmware credentials are required.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    const nowEpoch = Date.now();
    const metaData: DeviceMeta = {
      name,
      type: newDeviceType,
      createdAt: nowEpoch,
    };

    let authUid = incompleteDevice?.authUid || '';

    try {
      if (isDemoMode) {
        // Mock simulation
        MOCK_DEVICE_INDEX[id] = { name, type: newDeviceType };
        MOCK_DEVICES[id] = {
          id,
          meta: metaData,
          members: selectedUserUids.reduce((acc, uid) => ({ ...acc, [uid]: true }), {}),
          status: {
            state: 'UNKNOWN',
            since: nowEpoch,
            lastSeen: nowEpoch,
            appliedSettingsVersion: 1,
            fwVersion: 'v1.0.0-esp32',
          },
          settings: {
            version: 1,
            updatedAt: nowEpoch,
            values: getDefaultSettings(newDeviceType),
          },
          periods: {},
        };

        // Update mock users deviceIds
        selectedUserUids.forEach((uid) => {
          if (MOCK_USERS[uid]) {
            MOCK_USERS[uid].deviceIds = { ...MOCK_USERS[uid].deviceIds, [id]: true };
          }
        });

        setIncompleteDevice(null);
        showFeedback('success', `Device ${id} provisioned.`);
        setShowAddModal(false);
        return;
      }

      if (!rtdb) throw new Error('Database not connected.');

      // STEP 1: Write /devices/{id}/meta FIRST
      await set(ref(rtdb, `devices/${id}/meta`), metaData);

      // STEP 2:
      // (a) Write /deviceIndex/{id}
      await set(ref(rtdb, `deviceIndex/${id}`), {
        name,
        type: newDeviceType,
      });

      // (b) Create device login with secondary app (if not already created)
      if (!authUid) {
        let deviceEmail = `${id}@device.invalid`;
        const secondaryAuth = getSecondaryAuth();
        if (secondaryAuth) {
          try {
            const cred = await createUserWithEmailAndPassword(secondaryAuth, deviceEmail, devicePassword);
            authUid = cred.user.uid;
          } catch (emailErr) {
            // Fallback email domain
            deviceEmail = `${id}@devices.watermonitor.example`;
            const cred = await createUserWithEmailAndPassword(secondaryAuth, deviceEmail, devicePassword);
            authUid = cred.user.uid;
          }
          await secondarySignOut(secondaryAuth);
        } else {
          authUid = `auth-${id}`;
        }
      }

      // (c) Write /deviceAuth/{authUid}: id, default status, default settings, and memberships
      const batchUpdates: Record<string, unknown> = {
        [`deviceAuth/${authUid}`]: id,
        [`devices/${id}/status`]: {
          state: 'UNKNOWN',
          since: nowEpoch,
          lastSeen: 0,
          appliedSettingsVersion: 1,
          fwVersion: 'v1.0.0-esp32',
        },
        [`devices/${id}/settings`]: {
          version: 1,
          updatedAt: nowEpoch,
          values: getDefaultSettings(newDeviceType),
        },
      };

      selectedUserUids.forEach((uid) => {
        batchUpdates[`devices/${id}/members/${uid}`] = true;
        batchUpdates[`users/${uid}/deviceIds/${id}`] = true;
      });

      try {
        await update(ref(rtdb), batchUpdates);
      } catch (dbErr) {
        setIncompleteDevice({ id, authUid, name, type: newDeviceType, selectedUserUids });
        throw new Error('Device login created, but database configuration failed. Tap "Finish setup" to retry.');
      }

      setIncompleteDevice(null);
      showFeedback('success', `Device ${id} successfully provisioned.`);
      setShowAddModal(false);
    } catch (err: unknown) {
      if (authUid) {
        setIncompleteDevice({ id, authUid, name, type: newDeviceType, selectedUserUids });
      }
      const msg = getFriendlyErrorMessage(err, 'Failed to provision device.');
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Delete Device: removes meta, index, deviceAuth, memberships, and users' deviceIds entries
  const handleConfirmDelete = async () => {
    if (!deviceToDelete) return;
    const id = deviceToDelete.id;
    setDeleting(true);

    try {
      if (isDemoMode) {
        delete MOCK_DEVICE_INDEX[id];
        delete MOCK_DEVICES[id];
        Object.values(MOCK_USERS).forEach((u) => {
          if (u.deviceIds) delete u.deviceIds[id];
        });
      } else if (rtdb) {
        const batchRemovals: Record<string, unknown> = {
          [`devices/${id}`]: null,
          [`deviceIndex/${id}`]: null,
        };

        // Clear device from all user memberships
        Object.keys(usersMap).forEach((uid) => {
          batchRemovals[`users/${uid}/deviceIds/${id}`] = null;
        });

        // Also remove deviceAuth mapping for this device
        try {
          const authSnap = await get(ref(rtdb, 'deviceAuth'));
          if (authSnap.exists()) {
            const authObj = authSnap.val() as Record<string, string>;
            Object.entries(authObj).forEach(([authUid, mappedDevId]) => {
              if (mappedDevId === id) {
                batchRemovals[`deviceAuth/${authUid}`] = null;
              }
            });
          }
        } catch (e) {
          console.warn('[AdminDevicesPanel] deviceAuth cleanup note:', e);
        }

        await update(ref(rtdb), batchRemovals);
      }

      showFeedback('success', `Device ${id} deleted.`);
      setDeviceToDelete(null);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to delete device.');
      showFeedback('error', msg);
    } finally {
      setDeleting(false);
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

      {/* Incomplete Device Pending Setup Banner */}
      {incompleteDevice && !showAddModal && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div>
            <span className="font-bold block text-amber-200">Pending Device Setup: {incompleteDevice.id}</span>
            <span className="text-[11px] text-amber-300/80">Device login created ({incompleteDevice.authUid}). Complete setup to write deviceAuth mapping.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewDeviceId(incompleteDevice.id);
              setNewDeviceName(incompleteDevice.name);
              setNewDeviceType(incompleteDevice.type);
              setSelectedUserUids(incompleteDevice.selectedUserUids);
              setShowAddModal(true);
            }}
            className="min-h-[38px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0 text-xs shadow"
          >
            Finish Setup
          </button>
        </div>
      )}

      {/* Header & Add Action */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Device Hardware Feeds</h2>
              <p className="text-xs text-slate-400">{devices.length} sensor device(s) registered</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Device Cards List */}
      <div className="space-y-3">
        {devices.map((d) => {
          const memberCount = Object.keys(d.members || {}).length;

          return (
            <div
              key={d.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{d.meta.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      {d.meta.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {d.id}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeviceToDelete(d)}
                    className="min-h-[38px] p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs"
                    title="Delete device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-[11px]">
                  <span>FW: <strong className="text-slate-200">{d.status.fwVersion}</strong></span>
                  <span>&bull;</span>
                  <span>Settings: <strong className="text-slate-200">v{d.settings.version}</strong></span>
                </div>
                <span className="text-[11px] font-medium bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 text-slate-300">
                  {memberCount} member{memberCount === 1 ? '' : 's'} assigned
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Add &amp; Provision ESP32 Device
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {incompleteDevice && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <span>Login created ({incompleteDevice.authUid}). Tap Finish Setup to write deviceAuth and link device.</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Device ID (Hardware Identifier)</label>
                <input
                  type="text"
                  required
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="e.g. dev-pipe-03"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Human-Readable Name</label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. West District Pipeline"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Generated Device Password (Shown Once) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    ESP32 Device Password (Shown Once)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 select-all">
                    {devicePassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(devicePassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                    className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    {copiedPassword ? (
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
                <p className="text-[10px] text-slate-400">
                  Flash this password into the ESP32 firmware alongside email <code>{newDeviceId}@device.invalid</code>. It will not be displayed again.
                </p>
              </div>

              {/* Initial Member Users Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign User Members</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {Object.entries(usersMap).map(([uid, u]) => {
                    const isChecked = selectedUserUids.includes(uid);
                    return (
                      <label key={uid} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserUids((prev) => [...prev, uid]);
                            } else {
                              setSelectedUserUids((prev) => prev.filter((id) => id !== uid));
                            }
                          }}
                          className="rounded text-sky-500"
                        />
                        <span>{u.displayName || u.email} ({u.email})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !newDeviceId || (!devicePassword && !incompleteDevice)}
                onClick={handleCreateDevice}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {creating ? 'Provisioning...' : incompleteDevice ? 'Finish Setup' : 'Provision Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Device Confirmation Modal */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Device Feed</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete device <strong className="text-white">{deviceToDelete.meta.name}</strong> ({deviceToDelete.id})?
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              This will remove its database records, telemetry, index, deviceAuth, and assignments across all residents.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
              >
                {deleting ? 'Deleting...' : 'Delete Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
