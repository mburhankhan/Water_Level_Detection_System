import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Droplet, Home, History, CalendarClock, Bell, Settings, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export const AppShell: React.FC = () => {
  const { isDemo, role } = useAuth();
  const { devices, currentDevice, setCurrentDeviceId, isOnline } = useDevice();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Droplet className="w-5 h-5 fill-sky-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  Water Monitor
                </span>
                {isDemo && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 leading-none">
                    Demo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {role === 'admin' ? 'Admin Mode' : 'Resident'}
              </span>
            </div>
          </div>

          {/* Right Header: Device Switcher & Online state */}
          <div className="flex items-center gap-2">
            {/* Device Switcher (if > 1 device) */}
            {devices.length > 1 ? (
              <div className="relative">
                <select
                  value={currentDevice?.id}
                  onChange={(e) => setCurrentDeviceId(e.target.value)}
                  className="min-h-[44px] appearance-none bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.meta.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5 pointer-events-none" />
              </div>
            ) : currentDevice ? (
              <span className="text-xs text-slate-400 font-medium truncate max-w-[130px] hidden sm:inline">
                {currentDevice.meta.name}
              </span>
            ) : null}

            {/* Online Indicator Badge */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
              title={isOnline ? 'ESP32 heartbeat active' : 'Device heartbeat timed out'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area: Mobile-first 360px base up to max-w-lg */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 pb-24">
        <Outlet />
      </main>

      {/* Bottom Tab Bar (360px mobile base, fixed bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-2 flex items-center justify-around h-16">
          {[
            { to: '/', label: 'Home', icon: Home },
            { to: '/history', label: 'History', icon: History },
            { to: '/schedule', label: 'Schedule', icon: CalendarClock },
            { to: '/alerts', label: 'Alerts', icon: Bell },
            { to: '/settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-[11px] font-medium transition-all ${
                    isActive
                      ? 'text-sky-400 font-bold bg-sky-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
