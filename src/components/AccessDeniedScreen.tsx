import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export const AccessDeniedScreen: React.FC = () => {
  const { currentUser, signOut, isDemo, switchDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight">
          Access not granted. Contact the administrator.
        </h1>

        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          Your account ({currentUser?.email || 'authenticated user'}) has either not been provisioned by an administrator or has been deactivated.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-700/80 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-[0.99] text-white font-medium text-sm transition-all shadow"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          {isDemo && (
            <button
              type="button"
              onClick={() => switchDemoUser('admin')}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-medium text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch Back to Demo Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
