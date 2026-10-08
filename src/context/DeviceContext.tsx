import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Device, AvailabilityPeriod, DeviceMeta, DeviceStatus, DeviceSettings } from '../types';
import { useAuth } from './AuthContext';
import { MOCK_DEVICES, MOCK_USERS, MOCK_DEVICE_INDEX } from '../data/mock';
import { isDemoMode, rtdb } from '../lib/firebase';
import { ref, onValue, query, orderByChild, startAt, endAt, limitToLast, Unsubscribe } from 'firebase/database';

interface DeviceContextType {
  devices: Device[];
  currentDevice: Device | null;
  setCurrentDeviceId: (id: string) => void;
  isOnline: boolean;
  periods: AvailabilityPeriod[];
  selectedRangeDays: 7 | 30 | 90;
  setSelectedRangeDays: (days: 7 | 30 | 90) => void;
  loading: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, hasAccess } = useAuth();
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [devicesMap, setDevicesMap] = useState<Record<string, Partial<Device>>>({});
  const [selectedId, setSelectedId] = useState<string>('dev-pipe-01');
  const [selectedRangeDays, setSelectedRangeDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState<boolean>(!isDemoMode);

  // 1. Discover device IDs without ever reading the whole /devices branch
  useEffect(() => {
    if (isDemoMode) {
      if (isAdmin) {
        setDeviceIds(Object.keys(MOCK_DEVICE_INDEX));
      } else if (currentUser && MOCK_USERS[currentUser.uid]?.deviceIds) {
        setDeviceIds(Object.keys(MOCK_USERS[currentUser.uid].deviceIds || {}));
      } else {
        setDeviceIds(['dev-pipe-01']);
      }
      setLoading(false);
      return;
    }

    const db = rtdb;
    if (!db || !currentUser || !hasAccess) {
      setDeviceIds([]);
      setLoading(false);
      return;
    }

    let unsubDiscovery: Unsubscribe;
    if (isAdmin) {
      // For admin: list device IDs from /deviceIndex
      const indexRef = ref(db, 'deviceIndex');
      unsubDiscovery = onValue(
        indexRef,
        (snap) => {
          if (snap.exists()) {
            const keys = Object.keys(snap.val() || {});
            setDeviceIds(keys);
          } else {
            setDeviceIds([]);
          }
          setLoading(false);
        },
        (err) => {
          console.error('[Error reading deviceIndex]', err);
          setLoading(false);
        }
      );
    } else {
      // For users: use /users/{uid}/deviceIds
      const userDevicesRef = ref(db, `users/${currentUser.uid}/deviceIds`);
      unsubDiscovery = onValue(
        userDevicesRef,
        (snap) => {
          if (snap.exists()) {
            const keys = Object.keys(snap.val() || {});
            setDeviceIds(keys);
          } else {
            setDeviceIds([]);
          }
          setLoading(false);
        },
        (err) => {
          console.error('[Error reading user deviceIds]', err);
          setLoading(false);
        }
      );
    }

    return () => unsubDiscovery?.();
  }, [currentUser, isAdmin, hasAccess]);

  // 2. Per device: listen separately to meta, status, settings, and periods (limitToLast 500)
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, populate from MOCK_DEVICES for the current deviceIds
      const mockResult: Record<string, Device> = {};
      for (const id of deviceIds) {
        if (MOCK_DEVICES[id]) {
          mockResult[id] = { ...MOCK_DEVICES[id], id };
        }
      }
      setDevicesMap(mockResult);
      return;
    }

    const db = rtdb;
    if (!db || deviceIds.length === 0) {
      setDevicesMap({});
      return;
    }

    const unsubs: Unsubscribe[] = [];

    deviceIds.forEach((deviceId) => {
      // Set device ID from its key
      setDevicesMap((prev) => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          id: deviceId,
        },
      }));

      // Listen to meta
      const metaRef = ref(db, `devices/${deviceId}/meta`);
      const unsubMeta = onValue(metaRef, (snap) => {
        const val = snap.val() as DeviceMeta | null;
        if (val) {
          setDevicesMap((prev) => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              id: deviceId,
              meta: val,
              members: prev[deviceId]?.members || {},
            },
          }));
        }
      });
      unsubs.push(unsubMeta);

      // Listen to status
      const statusRef = ref(db, `devices/${deviceId}/status`);
      const unsubStatus = onValue(statusRef, (snap) => {
        const val = snap.val() as DeviceStatus | null;
        if (val) {
          setDevicesMap((prev) => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              id: deviceId,
              status: val,
            },
          }));
        }
      });
      unsubs.push(unsubStatus);

      // Listen to settings
      const settingsRef = ref(db, `devices/${deviceId}/settings`);
      const unsubSettings = onValue(settingsRef, (snap) => {
        const val = snap.val() as DeviceSettings | null;
        if (val) {
          setDevicesMap((prev) => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              id: deviceId,
              settings: val,
            },
          }));
        }
      });
      unsubs.push(unsubSettings);

      // Query periods by selected range with orderByChild("start") and startAt(rangeStartMs)
      // and also fetch the last period that started before range start (endAt(rangeStart - 1) with limitToLast(1))
      const rangeStartMs = Date.now() - selectedRangeDays * 86400000;
      let rangePeriods: Record<string, AvailabilityPeriod> = {};
      let priorPeriods: Record<string, AvailabilityPeriod> = {};

      const syncPeriods = () => {
        const combined = { ...priorPeriods, ...rangePeriods };
        setDevicesMap((prev) => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            id: deviceId,
            periods: combined,
          },
        }));
      };

      const periodsQuery = query(
        ref(db, `devices/${deviceId}/periods`),
        orderByChild('start'),
        startAt(rangeStartMs)
      );
      const unsubPeriods = onValue(periodsQuery, (snap) => {
        const val = (snap.val() || {}) as Record<string, AvailabilityPeriod>;
        rangePeriods = {};
        Object.entries(val).forEach(([periodKey, p]) => {
          rangePeriods[periodKey] = {
            ...p,
            id: periodKey,
          };
        });
        syncPeriods();
      });
      unsubs.push(unsubPeriods);

      // Fetch last period started before range start
      const priorQuery = query(
        ref(db, `devices/${deviceId}/periods`),
        orderByChild('start'),
        endAt(rangeStartMs - 1),
        limitToLast(1)
      );
      const unsubPrior = onValue(priorQuery, (snap) => {
        const val = (snap.val() || {}) as Record<string, AvailabilityPeriod>;
        priorPeriods = {};
        Object.entries(val).forEach(([periodKey, p]) => {
          priorPeriods[periodKey] = {
            ...p,
            id: periodKey,
          };
        });
        syncPeriods();
      });
      unsubs.push(unsubPrior);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [deviceIds, selectedRangeDays]);

  // Construct complete accessible devices list
  const accessibleDevices = useMemo(() => {
    return deviceIds
      .map((id) => devicesMap[id])
      .filter((d): d is Device => Boolean(d && d.id && d.meta && d.status && d.settings));
  }, [deviceIds, devicesMap]);

  // Pick current device
  const currentDevice = useMemo(() => {
    if (accessibleDevices.length === 0) return null;
    const found = accessibleDevices.find((d) => d.id === selectedId);
    return found || accessibleDevices[0];
  }, [accessibleDevices, selectedId]);

  // Compute online status based on lastSeen and offlineAfterSec
  const isOnline = useMemo(() => {
    if (!currentDevice) return false;
    const offlineSec = Number(currentDevice.settings?.values?.offlineAfterSec) || 180;
    const elapsedSec = (Date.now() - (currentDevice.status?.lastSeen || 0)) / 1000;
    return elapsedSec <= offlineSec;
  }, [currentDevice]);

  // Sorted periods list (newest first)
  const periods = useMemo(() => {
    if (!currentDevice || !currentDevice.periods) return [];
    return (Object.values(currentDevice.periods) as AvailabilityPeriod[]).sort(
      (a, b) => b.start - a.start
    );
  }, [currentDevice]);

  return (
    <DeviceContext.Provider
      value={{
        devices: accessibleDevices,
        currentDevice,
        setCurrentDeviceId: setSelectedId,
        isOnline,
        periods,
        selectedRangeDays,
        setSelectedRangeDays,
        loading,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
};
