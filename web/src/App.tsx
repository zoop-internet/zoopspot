import React, { useState, useEffect } from 'react';
import { LandingPage } from './landing/LandingPage';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { AppProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

const App: React.FC = () => {
  const getInitialMode = (): PortalMode => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#app' || hash === '#user') return 'user';
    if (hash === '#org') return 'org';
    if (hash === '#admin') return 'admin';
    return 'landing';
  };

  const [mode, setMode] = useState<PortalMode>(getInitialMode);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#app' || hash === '#user') setMode('user');
      else if (hash === '#org') setMode('org');
      else if (hash === '#admin') setMode('admin');
      else if (hash === '#landing' || hash === '#home') setMode('landing');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchMode = (m: PortalMode) => {
    setMode(m);
    if (m === 'landing') window.location.hash = '#home';
    else if (m === 'user') window.location.hash = '#app';
    else if (m === 'org') window.location.hash = '#org';
    else if (m === 'admin') window.location.hash = '#admin';
  };

  return (
    <AppProvider>
      {mode === 'landing' && <LandingPage onLaunchConsole={switchMode} />}
      {mode === 'user'    && <UserDashboard mode={mode} onSwitch={switchMode} />}
      {mode === 'org'     && <OrgDashboard  mode={mode} onSwitch={switchMode} />}
      {mode === 'admin'   && <AdminConsole  mode={mode} onSwitch={switchMode} />}
    </AppProvider>
  );
};

export default App;
