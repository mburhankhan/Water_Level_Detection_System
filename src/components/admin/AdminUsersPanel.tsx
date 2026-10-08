import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDevice } from '../../context/DeviceContext';
import { UserRecord, AlertProfile, Device } from '../../types';
import { MOCK_USERS, MOCK_ALERT_PROFILES } from '../../data/mock';
import { isDemoMode, rtdb, auth, getSecondaryAuth } from '../../lib/firebase';
import {
  ref,
  onValue,
  set,
  update,
  remove,
  get,
} from 'firebase/database';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as secondarySignOut,
} from 'firebase/auth';
import { generateSecurePassword } from '../../lib/cryptoUtils';
import { getFriendlyErrorMessage } from '../../lib/errorUtils';
import {
  Users,
  UserPlus,
  Search,
  Key,
  Copy,
  Check,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Mail,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';

interface IncompleteUser {
  uid: string;
  email: string;
}

export const AdminUsersPanel: React.FC = () => {
  const { currentUser, userRecord } = useAuth();
  const { devices } = useDevice();
  const [usersMap, setUsersMap] = useState<Record<string, UserRecord>>(isDemoMode ? MOCK_USERS : {});
  const [alertProfiles, setAlertProfiles] = useState<AlertProfile[]>(Object.values(MOCK_ALERT_PROFILES));
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // New User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newProfileId, setNewProfileId] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [tempPassword, setTempPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [incompleteUser, setIncompleteUser] = useState<IncompleteUser | null>(null);

  // Success / Action feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete User Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<{ uid: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign Devices Modal State
  const [editingDevicesUser, setEditingDevicesUser] = useState<{ uid: string; user: UserRecord } | null>(null);
  const [editingDeviceSelection, setEditingDeviceSelection] = useState<string[]>([]);

  // 1. Load users & alert profiles
  useEffect(() => {
    if (isDemoMode) {
      setUsersMap(MOCK_USERS);
      setAlertProfiles(Object.values(MOCK_ALERT_PROFILES));
      return;
    }

    if (!rtdb) return;

    // Load users
    const usersRef = ref(rtdb, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        setUsersMap(snap.val() as Record<string, UserRecord>);
      } else {
        setUsersMap({});
      }
    });

    // Load alert profiles
    const profilesRef = ref(rtdb, 'alertProfiles');
    const unsubProfiles = onValue(profilesRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, Omit<AlertProfile, 'id'>>;
        setAlertProfiles(
          Object.entries(val).map(([id, p]) => ({ ...p, id })).sort((a, b) => a.order - b.order)
        );
      }
    });

    return () => {
      unsubUsers();
      unsubProfiles();
    };
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Filter & Paginate Users
  const userList = useMemo(() => {
    return Object.entries(usersMap)
      .map(([uid, u]) => ({ uid, ...u }))
      .filter((u) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          u.email.toLowerCase().includes(q) ||
          (u.displayName && u.displayName.toLowerCase().includes(q))
        );
      })
      .slice(0, 100); // Up to 100 users listed
  }, [usersMap, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(userList.length / pageSize));
  const paginatedUsers = userList.slice((page - 1) * pageSize, page * pageSize);

  // Open Add User Dialog
  const handleOpenAddModal = () => {
    setNewEmail('');
    setNewDisplayName('');
    setNewProfileId(alertProfiles[0]?.id || '');
    setSelectedDeviceIds(devices.length > 0 ? [devices[0].id] : []);
    setTempPassword(generateSecurePassword(14));
    setCopiedPassword(false);
    setCreateError(null);
    setIncompleteUser(null);
    setShowAddModal(true);
  };

  // Step (a) & (b) user provisioning
  const handleCreateUser = async () => {
    if (!newEmail || !tempPassword) {
      setCreateError('Email and temporary password are required.');
      return;
    }
    setCreateError(null);
    setCreating(true);

    let createdUid = incompleteUser?.uid;

    try {
      if (isDemoMode) {
        // Demo simulation
        const mockUid = createdUid || `mock-uid-${Date.now().toString(36)}`;
        const devMap: Record<string, boolean> = {};
        selectedDeviceIds.forEach((id) => (devMap[id] = true));

        const newUserRecord: UserRecord = {
          email: newEmail,
          displayName: newDisplayName || 'User',
          role: 'user',
          active: true,
          profileId: newProfileId,
          createdAt: Date.now(),
          createdBy: currentUser?.uid || 'admin',
          mustChangePassword: true,
          prefs: {
            timeZone: 'Asia/Karachi',
            use24h: false,
            theme: 'system',
          },
          deviceIds: devMap,
        };

        setUsersMap((prev) => ({
          ...prev,
          [mockUid]: newUserRecord,
        }));

        showFeedback('success', `User ${newEmail} created successfully.`);
        setShowAddModal(false);
        return;
      }

      // Real Firebase Mode:
      // 1. Create with secondary app if not already created
      if (!createdUid) {
        const secondaryAuth = getSecondaryAuth();
        if (!secondaryAuth) {
          throw new Error('Secondary auth instance could not be initialized.');
        }

        const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, tempPassword);
        createdUid = cred.user.uid;
        await secondarySignOut(secondaryAuth);
      }

      if (!rtdb) throw new Error('Database connection not available.');

      // (a) Write /users/{uid}
      const newUserRecord: UserRecord = {
        email: newEmail,
        displayName: newDisplayName || 'User',
        role: 'user',
        active: true,
        profileId: newProfileId,
        createdAt: Date.now(),
        createdBy: currentUser?.uid || '',
        mustChangePassword: true,
        prefs: {
          timeZone: 'Asia/Karachi',
          use24h: false,
          theme: 'system',
        },
      };

      try {
        await set(ref(rtdb, `users/${createdUid}`), newUserRecord);
      } catch (dbErr) {
        setIncompleteUser({ uid: createdUid, email: newEmail });
        throw new Error('Auth login created, but database record failed. Tap "Finish setup" to retry.');
      }

      // (b) Write deviceIds and memberships
      const updates: Record<string, unknown> = {};
      selectedDeviceIds.forEach((devId) => {
        updates[`users/${createdUid}/deviceIds/${devId}`] = true;
        updates[`devices/${devId}/members/${createdUid}`] = true;
      });

      if (Object.keys(updates).length > 0) {
        try {
          await update(ref(rtdb), updates);
        } catch {
          setIncompleteUser({ uid: createdUid, email: newEmail });
          throw new Error('User created, but device assignment failed. Tap "Finish setup" to retry.');
        }
      }

      showFeedback('success', `User ${newEmail} created and provisioned.`);
      setShowAddModal(false);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to provision user.');
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (uid: string, currentActive: boolean) => {
    if (uid === currentUser?.uid) {
      showFeedback('error', 'Administrator cannot disable their own account.');
      return;
    }

    try {
      if (isDemoMode) {
        setUsersMap((prev) => ({
          ...prev,
          [uid]: { ...prev[uid], active: !currentActive },
        }));
      } else if (rtdb) {
        await set(ref(rtdb, `users/${uid}/active`), !currentActive);
      }
      showFeedback('success', `User ${currentActive ? 'deactivated' : 'activated'}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status.';
      showFeedback('error', msg);
    }
  };

  // Change user alert profile
  const handleChangeUserProfile = async (uid: string, profileId: string) => {
    try {
      if (isDemoMode) {
        setUsersMap((prev) => ({
          ...prev,
          [uid]: { ...prev[uid], profileId },
        }));
      } else if (rtdb) {
        await set(ref(rtdb, `users/${uid}/profileId`), profileId);
      }
      showFeedback('success', 'Alert profile updated for user.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update alert profile.';
      showFeedback('error', msg);
    }
  };

  // Send password reset email
  const handleSendResetEmail = async (userEmail: string) => {
    try {
      if (isDemoMode) {
        showFeedback('success', `Password reset email dispatched to ${userEmail} (Demo mode simulated).`);
      } else if (auth) {
        await sendPasswordResetEmail(auth, userEmail);
        showFeedback('success', `Password reset email sent to ${userEmail}.`);
      }
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to send password reset email.');
      showFeedback('error', msg);
    }
  };

  // Open Edit Devices Modal
  const handleOpenEditDevices = (uid: string, user: UserRecord) => {
    setEditingDevicesUser({ uid, user });
    setEditingDeviceSelection(Object.keys(user.deviceIds || {}));
  };

  // Save Edit Devices
  const handleSaveDevices = async () => {
    if (!editingDevicesUser) return;
    const uid = editingDevicesUser.uid;
    const oldDevices = Object.keys(editingDevicesUser.user.deviceIds || {});

    try {
      if (isDemoMode) {
        const devMap: Record<string, boolean> = {};
        editingDeviceSelection.forEach((id) => (devMap[id] = true));
        setUsersMap((prev) => ({
          ...prev,
          [uid]: { ...prev[uid], deviceIds: devMap },
        }));
      } else if (rtdb) {
        const updates: Record<string, unknown> = {};
        // Clear old
        oldDevices.forEach((devId) => {
          updates[`users/${uid}/deviceIds/${devId}`] = null;
          updates[`devices/${devId}/members/${uid}`] = null;
        });
        // Set new
        editingDeviceSelection.forEach((devId) => {
          updates[`users/${uid}/deviceIds/${devId}`] = true;
          updates[`devices/${devId}/members/${uid}`] = true;
        });
        await update(ref(rtdb), updates);
      }
      showFeedback('success', 'Device assignments updated.');
      setEditingDevicesUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update device assignments.';
      showFeedback('error', msg);
    }
  };

  // Delete User Record
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.uid;

    if (uid === currentUser?.uid) {
      showFeedback('error', 'Administrator cannot delete their own account.');
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    try {
      if (isDemoMode) {
        setUsersMap((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      } else if (rtdb) {
        const targetUser = usersMap[uid];
        const assignedDevs = Object.keys(targetUser?.deviceIds || {});
        const updates: Record<string, unknown> = {
          [`users/${uid}`]: null,
        };
        assignedDevs.forEach((devId) => {
          updates[`devices/${devId}/members/${uid}`] = null;
        });
        await update(ref(rtdb), updates);
      }
      showFeedback('success', `User record deleted for ${userToDelete.email}.`);
      setUserToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user record.';
      showFeedback('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
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

      {/* Header & Add User Action */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">User Management</h2>
              <p className="text-xs text-slate-400">
                {userList.length} user{userList.length === 1 ? '' : 's'} registered
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Security Help Notice */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            The administrator cannot view or directly reset account passwords (no Admin SDK). Users manage their own passwords, or you can dispatch a password-reset link. Temporary credentials can only be generated and copied once upon account creation.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by email or display name..."
            className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            Admins cannot view or set existing user passwords. Users receive password reset emails.
          </span>
        </p>
      </div>

      {/* User Table / Cards List */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        {paginatedUsers.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No users found matching your search.
          </p>
        ) : (
          <div className="space-y-3">
            {paginatedUsers.map((u) => {
              const isSelf = u.uid === currentUser?.uid;
              const assignedCount = Object.keys(u.deviceIds || {}).length;

              return (
                <div
                  key={u.uid}
                  className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm truncate">{u.displayName || u.email}</span>
                      {u.role === 'admin' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          User
                        </span>
                      )}
                      {u.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                      {u.mustChangePassword && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Password Change Pending
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 font-mono text-[11px] truncate">{u.email}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span>Devices: <strong className="text-slate-200">{assignedCount}</strong></span>
                      <span>&bull;</span>
                      <span>
                        Profile:{' '}
                        <select
                          value={u.profileId || ''}
                          onChange={(e) => handleChangeUserProfile(u.uid, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                        >
                          <option value="">Default (None)</option>
                          {alertProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                    {/* Assign Devices Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditDevices(u.uid, u)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1"
                      title="Assign or remove devices"
                    >
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Devices ({assignedCount})</span>
                    </button>

                    {/* Send Reset Email */}
                    <button
                      type="button"
                      onClick={() => handleSendResetEmail(u.email)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1"
                      title="Send password reset email"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Email</span>
                    </button>

                    {/* Enable / Disable Button */}
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u.uid, u.active)}
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1 ${
                          u.active
                            ? 'bg-slate-800 text-rose-300 border-rose-500/30 hover:bg-rose-500/10'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}

                    {/* Delete User Button */}
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete({ uid: u.uid, email: u.email })}
                        className="min-h-[36px] p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs"
                        title="Delete user record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Client-side Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                Provision New User Account
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

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">User Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="resident@example.com"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Tariq Ahmed"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Temporary Password Display & Generator */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Temporary Password (Shown Once)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempPassword(generateSecurePassword(14));
                      setCopiedPassword(false);
                    }}
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate New
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 select-all">
                    {tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
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
                  Provide this password to the user. They will be forced to change it upon first login. It will never be stored or shown again.
                </p>
              </div>

              {/* Initial Alert Profile */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Alert Profile</label>
                <select
                  value={newProfileId}
                  onChange={(e) => setNewProfileId(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 text-white focus:outline-none"
                >
                  <option value="">None / Default</option>
                  {alertProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Device Assignment */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign Pipeline Devices</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {devices.map((d) => {
                    const isChecked = selectedDeviceIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeviceIds((prev) => [...prev, d.id]);
                            } else {
                              setSelectedDeviceIds((prev) => prev.filter((id) => id !== d.id));
                            }
                          }}
                          className="rounded text-sky-500 focus:ring-0"
                        />
                        <span>{d.meta.name}</span>
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
                disabled={creating || !newEmail || !tempPassword}
                onClick={handleCreateUser}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {creating ? 'Creating Account...' : incompleteUser ? 'Finish Setup' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assigned Devices Modal */}
      {editingDevicesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Assign Devices: {editingDevicesUser.user.email}
              </h3>
              <button type="button" onClick={() => setEditingDevicesUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select which pipeline sensor feeds this resident is granted access to view:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              {devices.map((d) => {
                const isChecked = editingDeviceSelection.includes(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingDeviceSelection((prev) => [...prev, d.id]);
                        } else {
                          setEditingDeviceSelection((prev) => prev.filter((id) => id !== d.id));
                        }
                      }}
                      className="rounded text-sky-500"
                    />
                    <div>
                      <span className="font-semibold text-white block">{d.meta.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {d.id}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDevicesUser(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDevices}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Record Confirmation Sheet */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete User Record</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Are you sure you want to delete the database record for{' '}
                <strong className="text-white">{userToDelete.email}</strong>?
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-amber-300 block mb-1">⚠️ Note:</span>
                This removes their user profile and all device access permissions. The underlying Firebase Auth login credentials will still exist, but without an active database record they will be denied access and cannot use Water Monitor.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteUser}
                className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
              >
                {deleting ? 'Deleting...' : 'Delete User Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
