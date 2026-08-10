import React from 'react';
import { Activity, Shield, HardDrive, Share2, Terminal } from 'lucide-react';

interface TopbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <img src="/zoop-logo.svg" alt="Zoop Logo" />
        </div>
        <span className="brand-name">ZOOP</span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Overview
        </button>
        <button
          className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <HardDrive size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Devices
        </button>
        <button
          className={`nav-item ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Shield size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Connections
        </button>
        <button
          className={`nav-item ${activeTab === 'sharing' ? 'active' : ''}`}
          onClick={() => setActiveTab('sharing')}
        >
          <Share2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Sharing
        </button>
        <button
          className={`nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          <Terminal size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Diagnostics
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="status-badge trusted">
          <span className="pulse-dot" style={{ backgroundColor: '#14f06d' }}></span>
          Cloud Connected
        </div>
      </div>
    </header>
  );
};
