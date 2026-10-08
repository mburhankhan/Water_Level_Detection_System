import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/AppShell';
import { LoginScreen } from './components/LoginScreen';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { SchedulePage } from './pages/SchedulePage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Droplet } from 'lucide-react';

const RootRouter: React.FC = () => {
  const { currentUser, hasAccess, loading } = useAuth();

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
