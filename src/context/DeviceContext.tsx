import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Device, AvailabilityPeriod } from '../types';
import { useAuth } from './AuthContext';
import { MOCK_DEVICES } from '../data/mock';
import { isDemoMode, rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

interface DeviceContextType {
  devices: Device[];
  currentDevice: Device | null;
  setCurrentDeviceId: (id: string) => void;
  isOnline: boolean;
  periods: AvailabilityPeriod[];
  loading: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, hasAccess } = useAuth();
  const [devicesMap, setDevicesMap] = useState<Record<string, Device>>(isDemoMode ? MOCK_DEVICES : {});
  const [selectedId, setSelectedId] = useState<string>('dev-pipe-01');
  const [loading, setLoading] = useState<boolean>(!isDemoMode);

  // Load devices from RTDB in real mode
  useEffect(() => {
    if (isDemoMode) {
      setDevicesMap(MOCK_DEVICES);
      setLoading(false);
      return;
    }

    if (!rtdb || !currentUser || !hasAccess) {
      setLoading(false);
      return;
    }

    const devicesRef = ref(rtdb, 'devices');
    const unsub = onValue(
      devicesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setDevicesMap(snapshot.val());
        } else {
          setDevicesMap({});
        }
        setLoading(false);
      },
      (err) => {
        console.error('[Error loading devices]', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, hasAccess]);

  // Filter accessible devices
  const accessibleDevices = useMemo(() => {
    if (!currentUser) return [];
    const all = Object.values(devicesMap);
    if (isAdmin) return all;
    return all.filter((d) => d.members && d.members[currentUser.uid] === true);
  }, [devicesMap, currentUser, isAdmin]);

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
