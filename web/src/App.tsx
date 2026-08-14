import React, { useState } from 'react';
import { UserDashboard } from './app/user/UserDashboard';
import { OrgDashboard } from './app/org/OrgDashboard';
import { AdminConsole } from './admin/AdminConsole';
import { NetworkProvider } from './context/NetworkContext';
import type { PortalMode } from './types';

export type { PortalMode };

/**
 * App root — in production these are separate domains (app.zoop.com, admin.zoop.com).
 * Dev: portal switcher lives in each portal's sidebar (Cloudflare Zero Trust style).
 */
const App: React.FC = () => {
  const [mode, setMode] = useState<PortalMode>('user');

  return (
    <NetworkProvider>
      {mode === 'user' && <UserDashboard mode={mode} onSwitch={setMode} />}
      {mode === 'org' && <OrgDashboard mode={mode} onSwitch={setMode} />}
      {mode === 'admin' && <AdminConsole mode={mode} onSwitch={setMode} />}
    </NetworkProvider>
  );
};

export default App;

