import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ref, get, set, onValue } from 'firebase/database';
import { auth, rtdb, isDemoMode } from '../lib/firebase';
import { UserRecord, Role } from '../types';
import {
  MOCK_USERS,
  MOCK_ADMIN_UID,
  MOCK_USER_UID,
  MOCK_INACTIVE_UID,
} from '../data/mock';

interface AuthContextType {
  currentUser: { uid: string; email: string | null } | null;
  userRecord: UserRecord | null;
  role: Role;
  isActive: boolean;
  isAdmin: boolean;
  hasAccess: boolean; // true if active === true and userRecord exists
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoUser: (target: 'admin' | 'user' | 'inactive' | 'unregistered') => void;
  updateUserPrefs: (prefs: Partial<UserRecord['prefs']>) => Promise<void>;
  updateUserProfileId: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminUid, setAdminUid] = useState<string | null>(isDemoMode ? MOCK_ADMIN_UID : null);

  // Demo user switch handler
  const switchDemoUser = useCallback((target: 'admin' | 'user' | 'inactive' | 'unregistered') => {
    setLoading(true);
    if (target === 'admin') {
      setCurrentUser({ uid: MOCK_ADMIN_UID, email: 'admin@watermonitor.local' });
      setUserRecord(MOCK_USERS[MOCK_ADMIN_UID]);
    } else if (target === 'user') {
      setCurrentUser({ uid: MOCK_USER_UID, email: 'resident@watermonitor.local' });
      setUserRecord(MOCK_USERS[MOCK_USER_UID]);
    } else if (target === 'inactive') {
      setCurrentUser({ uid: MOCK_INACTIVE_UID, email: 'inactive@watermonitor.local' });
      setUserRecord(MOCK_USERS[MOCK_INACTIVE_UID]);
    } else {
      // Unregistered user
      setCurrentUser({ uid: 'unregistered-uid-999', email: 'guest@unknown.local' });
      setUserRecord(null);
    }
    setLoading(false);
  }, []);

  // Initialize Auth state
  useEffect(() => {
    if (isDemoMode) {
      // Default to resident user in demo mode so user sees standard experience first, or admin
      switchDemoUser('admin');
      return;
    }

    const db = rtdb;
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    // Fetch /config/adminUid once
    const adminUidRef = ref(db, 'config/adminUid');
    get(adminUidRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setAdminUid(snapshot.val());
        }
      })
      .catch((err) => console.error('[Error loading adminUid]', err));

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setCurrentUser(null);
        setUserRecord(null);
        setLoading(false);
        return;
      }

      setCurrentUser({ uid: fbUser.uid, email: fbUser.email });

      try {
        const userRef = ref(db, `users/${fbUser.uid}`);
        const userSnap = await get(userRef);

        if (userSnap.exists()) {
          setUserRecord(userSnap.val());
        } else {
          // Self-heal: If uid === adminUid and record doesn't exist, create it!
          const currentAdminUid = (await get(ref(db, 'config/adminUid'))).val();
          if (currentAdminUid && fbUser.uid === currentAdminUid) {
            const newAdminRecord: UserRecord = {
              email: fbUser.email || 'admin@watermonitor.local',
              displayName: 'Admin',
              role: 'admin',
              active: true,
              profileId: 'prof-all',
              createdAt: Date.now(),
              createdBy: fbUser.uid,
              prefs: {
                timeZone: 'Asia/Karachi',
                use24h: false,
                theme: 'system',
              },
            };
            await set(userRef, newAdminRecord);
            setUserRecord(newAdminRecord);
          } else {
            // Not admin, no user record -> access denied
            setUserRecord(null);
          }
        }
      } catch (err) {
        console.error('[Error loading user record]', err);
        setUserRecord(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [switchDemoUser]);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    if (isDemoMode) {
      const lower = email.toLowerCase().trim();
      if (lower.includes('admin')) {
        switchDemoUser('admin');
      } else if (lower.includes('inactive')) {
        switchDemoUser('inactive');
      } else if (lower.includes('guest') || lower.includes('new')) {
        switchDemoUser('unregistered');
      } else {
        switchDemoUser('user');
      }
      return;
    }

    if (!auth) throw new Error('Firebase Auth not available');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      setUserRecord(null);
      return;
    }
    if (auth) {
      await firebaseSignOut(auth);
    }
    setCurrentUser(null);
    setUserRecord(null);
  };

  const updateUserPrefs = async (prefsUpdate: Partial<UserRecord['prefs']>) => {
    if (!currentUser || !userRecord) return;
    const newPrefs = { ...userRecord.prefs, ...prefsUpdate };
    const updatedRecord: UserRecord = { ...userRecord, prefs: newPrefs };

    setUserRecord(updatedRecord);

    if (!isDemoMode && rtdb) {
      await set(ref(rtdb, `users/${currentUser.uid}/prefs`), newPrefs);
    }
  };

  const updateUserProfileId = async (profileId: string) => {
    if (!currentUser || !userRecord) return;
    const updatedRecord: UserRecord = { ...userRecord, profileId };
    setUserRecord(updatedRecord);

    if (!isDemoMode && rtdb) {
      await set(ref(rtdb, `users/${currentUser.uid}/profileId`), profileId);
    }
  };

  const isAdmin =
    currentUser !== null &&
    (userRecord?.role === 'admin' || (adminUid !== null && currentUser.uid === adminUid));

  const isActive = Boolean(userRecord?.active);
  const hasAccess = Boolean(currentUser && userRecord && isActive);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRecord,
        role: isAdmin ? 'admin' : 'user',
        isActive,
        isAdmin,
        hasAccess,
        loading,
        isDemo: isDemoMode,
        signIn,
        signOut,
        switchDemoUser,
        updateUserPrefs,
        updateUserProfileId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
