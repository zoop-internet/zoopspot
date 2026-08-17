import React, { useState } from 'react';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { AppProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

const App: React.FC = () => {
  const [mode, setMode] = useState<PortalMode>('user');

  return (
    <AppProvider>
      {mode === 'user'    && <UserDashboard mode={mode} onSwitch={setMode} />}
      {mode === 'org'     && <OrgDashboard  mode={mode} onSwitch={setMode} />}
      {mode === 'admin'   && <AdminConsole  mode={mode} onSwitch={setMode} />}
    </AppProvider>
  );
};

export default App;
