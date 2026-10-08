import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Lock, Mail, Shield, AlertCircle, ArrowRight, UserCheck, UserX } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn, isDemo, switchDemoUser, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Droplet className="w-8 h-8 fill-sky-500" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Water Monitor
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          ESP32 Pipeline Water Availability Monitoring
        </p>

        {isDemo && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode Active (Mock Data)
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pass" className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  id="pass"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full min-h-[44px] mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white font-medium text-sm transition-all shadow-md shadow-sky-600/20 disabled:opacity-50"
            >
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo mode quick-switch profiles */}
          {isDemo && (
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <p className="text-xs font-medium text-slate-400 mb-2.5 text-center">
                Instant Demo Access (Tap to switch):
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchDemoUser('admin')}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-sky-400 border border-slate-700 text-xs font-medium transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Role</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoUser('user')}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Resident Role</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoUser('inactive')}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-amber-400 border border-slate-700 text-xs font-medium transition-all"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Inactive User</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchDemoUser('unregistered')}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-rose-400 border border-slate-700 text-xs font-medium transition-all"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unregistered</span>
                </button>
              </div>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-slate-500">
            Accounts are provisioned by the system administrator. Self sign-up is not permitted.
          </p>
        </div>
      </div>
    </div>
  );
};
