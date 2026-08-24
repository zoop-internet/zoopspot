import React, { useState, useEffect } from 'react';
import { LandingPage } from './landing/LandingPage';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { AppProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  const handleSwitchMode = (mode: PortalMode) => {
    if (mode === 'user') navigateTo('/app');
    else if (mode === 'org') navigateTo('/org');
    else if (mode === 'admin') navigateTo('/admin');
    else navigateTo('/');
  };

  // Resolve active portal mode based on clean path
  const normalized = currentPath.toLowerCase();
  const isApp = normalized === '/app' || normalized === '/user';
  const isOrg = normalized === '/org';
  const isAdmin = normalized === '/admin';

  return (
    <AppProvider>
      {isApp ? (
        <UserDashboard mode="user" onSwitch={handleSwitchMode} />
      ) : isOrg ? (
        <OrgDashboard mode="org" onSwitch={handleSwitchMode} />
      ) : isAdmin ? (
        <AdminConsole mode="admin" onSwitch={handleSwitchMode} />
      ) : (
        <LandingPage
          currentPath={currentPath}
          onNavigate={navigateTo}
          onLaunchConsole={handleSwitchMode}
        />
      )}
    </AppProvider>
  );
};

export default App;
