import React, { useState } from 'react';
import { UserDashboard } from './app/user/UserDashboard';
import { AdminConsole } from './admin/AdminConsole';
import type { PortalMode } from './types';

export type { PortalMode };

/**
 * App root — in production these are separate domains.
 * Dev: portal switcher lives in each portal's sidebar (Cloudflare-style).
 */
const App: React.FC = () => {
  const [mode, setMode] = useState<PortalMode>('user');
  return mode === 'user'
    ? <UserDashboard mode={mode} onSwitch={setMode} />
    : <AdminConsole  mode={mode} onSwitch={setMode} />;
};

export default App;
