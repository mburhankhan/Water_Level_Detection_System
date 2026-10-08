import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/AppShell';
import { LoginScreen } from './components/LoginScreen';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { MustChangePasswordScreen } from './components/MustChangePasswordScreen';
import { HomePage } from './pages/HomePage';
import { AlertsPage } from './pages/AlertsPage';
import { Droplet } from 'lucide-react';

const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const SchedulePage = React.lazy(() => import('./pages/SchedulePage').then((m) => ({ default: m.SchedulePage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const RootRouter: React.FC = () => {
  const { currentUser, userRecord, hasAccess, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 animate-pulse mb-3">
          <Droplet className="w-6 h-6 fill-sky-500" />
        </div>
        <p className="text-xs font-mono text-slate-500">Initializing Water Monitor...</p>
      </div>
    );
  }

  // If user is not authenticated, show LoginScreen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // If user is signed in but has no active user record, show AccessDeniedScreen
  if (!hasAccess) {
    return <AccessDeniedScreen />;
  }

  // If user must change temporary password, force change password screen
  if (userRecord?.mustChangePassword) {
    return <MustChangePasswordScreen />;
  }

  // User is authenticated and active: mount DeviceProvider and AppShell with routes
  return (
    <DeviceProvider>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DeviceProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <RootRouter />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
