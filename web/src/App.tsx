import React, { useState } from 'react';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { DesktopClient } from './desktop/DesktopClient';
import { AppProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

const App: React.FC = () => {
  // If running inside native Wails environment, default to desktop mode
  const isWails = typeof window !== 'undefined' && !!window.go?.main?.App;
  const [mode, setMode] = useState<PortalMode>(isWails ? 'desktop' : 'desktop');

  return (
    <AppProvider>
      {mode === 'desktop' && <DesktopClient mode={mode} onSwitch={setMode} />}
      {mode === 'user'    && <UserDashboard mode={mode} onSwitch={setMode} />}
      {mode === 'org'     && <OrgDashboard  mode={mode} onSwitch={setMode} />}
      {mode === 'admin'   && <AdminConsole  mode={mode} onSwitch={setMode} />}
    </AppProvider>
  );
};

export default App;
