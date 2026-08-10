import React, { useState } from 'react';
import { Topbar } from './components/Topbar';
import { Overview } from './components/Overview';
import { DeviceManager } from './components/DeviceManager';
import { ConnectionMonitor } from './components/ConnectionMonitor';
import { SharingManager } from './components/SharingManager';
import { Diagnostics } from './components/Diagnostics';
import './index.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  return (
    <div className="app-shell">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-container">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'devices' && <DeviceManager />}
        {activeTab === 'connections' && <ConnectionMonitor />}
        {activeTab === 'sharing' && <SharingManager />}
        {activeTab === 'diagnostics' && <Diagnostics />}
      </main>
    </div>
  );
};

export default App;
