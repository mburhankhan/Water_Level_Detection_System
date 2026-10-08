import React from 'react';
import { Settings, User, Globe, LogOut, Shield, Laptop } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { userRecord, role, signOut, isDemo, switchDemoUser } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700/60">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              {userRecord?.displayName || 'User'}
            </h2>
            <p className="text-xs text-slate-400 truncate">{userRecord?.email}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-slate-900 border border-slate-700 text-slate-300">
            {role}
          </span>
        </div>

        {/* Theme Preferences */}
        <div className="mt-4 pt-1 space-y-3">
          <span className="text-xs font-semibold text-slate-300 block">Theme Preference</span>
          <div className="grid grid-cols-3 gap-2">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`min-h-[44px] rounded-xl text-xs font-medium capitalize border transition-all ${
                  theme === t
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700/60 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-6 pt-4 border-t border-slate-700/60">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-750 hover:bg-slate-700 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Demo Switcher Quick Bar */}
      {isDemo && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Demo Mode Quick Switch
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Switch simulated identities to test role permissions and access states:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchDemoUser('admin')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                role === 'admin'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Admin (Full Access)
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('user')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                role === 'user' && userRecord?.active
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Resident (Standard)
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('inactive')}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border bg-slate-900 border-slate-700 text-amber-300 hover:text-amber-200"
            >
              Inactive Account (Access Denied)
            </button>
            <button
              type="button"
              onClick={() => switchDemoUser('unregistered')}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border bg-slate-900 border-slate-700 text-rose-300 hover:text-rose-200"
            >
              Unregistered (Access Denied)
            </button>
          </div>
        </div>
      )}

      {/* M3 & M4 Roadmap Card */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Upcoming Milestones</p>
        <p>
          <strong>M3:</strong> Schema-driven Device Settings with Pending/Applied synchronization state, Time zone selection, and Password changes.
        </p>
        <p className="mt-1">
          <strong>M4:</strong> Admin management panels: User provisioning (secondary Firebase auth instance), Alert Profile builder, and Device provisioning.
        </p>
      </div>
    </div>
  );
};
