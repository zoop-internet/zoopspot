import React, { useState, useEffect, useCallback } from 'react';
import type {
  DesktopPeerInfo,
  DesktopStatus,
  DesktopTelemetry,
  DesktopDiagnosticsReport,
  DesktopSettings,
  ActivityEvent,
} from './types';
import './style.css';

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          GetStatus: () => Promise<DesktopStatus>;
          ConnectPeer: (id: string) => Promise<DesktopStatus>;
          Disconnect: () => Promise<DesktopStatus>;
          GetPeers: () => Promise<DesktopPeerInfo[]>;
          RunDiagnostics: () => Promise<DesktopDiagnosticsReport>;
          GetTelemetry: () => Promise<DesktopTelemetry>;
          GetSettings: () => Promise<DesktopSettings>;
          SaveSettings: (s: DesktopSettings) => Promise<boolean>;
        };
      };
    };
    runtime?: {
      EventsOn: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

type NavPage = 'home' | 'peers' | 'activity' | 'settings';

const INITIAL_STATUS: DesktopStatus = {
  connected: false,
  state: 'idle',
  assigned_ip: '—',
  public_ip: '—',
  tunnel_if_name: 'zoop0',
  version: '1.0.0',
};

/* ── Feather Icons ─────────────────────────────────────────── */
const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const Icons = {
  power: 'M18.36 6.64a9 9 0 1 1-12.73 0 M12 2v10',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  peers: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  download: 'M12 4v12m0 0l-4-4m4 4l4-4',
  upload: 'M12 20V8m0 0l-4 4m4-4l4 4',
  globe: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
};


export const App: React.FC = () => {
  const [page, setPage] = useState<NavPage>('home');
  const [status, setStatus] = useState<DesktopStatus>(INITIAL_STATUS);
  const [peers, setPeers] = useState<DesktopPeerInfo[]>([]);
  const [telemetry, setTelemetry] = useState<DesktopTelemetry>({
    download_rate_kbps: 0,
    upload_rate_kbps: 0,
    total_rx_bytes: 0,
    total_tx_bytes: 0,
    latency_ms: 0,
    packet_loss_pct: 0,
    path_type: 'none',
    nat_type: 'Direct',
  });
  const [events] = useState<ActivityEvent[]>([
    {
      id: 'e1',
      timestamp: 'Just now',
      type: 'security',
      title: 'Zoop Daemon Started',
      description: 'Listening for connections.',
      level: 'info',
    },
  ]);
  const [settings, setSettings] = useState<DesktopSettings>({
    auto_connect: false,
    kill_switch: true,
    allow_local_lan: true,
    split_tunnel: false,
    dns_servers: ['1.1.1.1', '1.0.0.1'],
    control_plane_url: 'http://localhost:8080',
    device_name: 'Workstation',
    tunnel_if_name: 'zoop0',
    theme_accent: 'cyan',
    max_sharing_bandwidth_mbps: 100,
  });

  const [connecting, setConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme_accent);
  }, [settings.theme_accent]);

  const addToast = useCallback((text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  // Sync Backend
  useEffect(() => {
    const syncBackend = async () => {
      if (window.go?.main?.App) {
        try {
          const s = await window.go.main.App.GetStatus();
          setStatus(s);
          const p = await window.go.main.App.GetPeers();
          setPeers(p || []);
          const t = await window.go.main.App.GetTelemetry();
          setTelemetry(t);
        } catch {}
      }
    };
    syncBackend();
    const interval = setInterval(syncBackend, 1500);
    if (window.runtime?.EventsOn) {
      window.runtime.EventsOn('agent_state_update', syncBackend);
    }
    return () => clearInterval(interval);
  }, []);

  const toggleTunnel = async () => {
    setConnecting(true);
    if (window.go?.main?.App) {
      try {
        if (status.connected) {
          await window.go.main.App.Disconnect();
          addToast('Disconnected');
        } else {
          await window.go.main.App.ConnectPeer('');
          addToast('Connected');
        }
      } catch {
        addToast('Action failed');
      }
    } else {
      // Mock toggle if no backend
      setTimeout(() => {
        setStatus((s) => ({
          ...s,
          connected: !s.connected,
          assigned_ip: !s.connected ? '100.64.0.12' : '—',
          active_peer_name: !s.connected ? 'Frankfurt Relay' : '',
        }));
        setConnecting(false);
      }, 600);
      return;
    }
    setConnecting(false);
  };

  const connectToPeer = async (id: string) => {
    setConnecting(true);
    if (window.go?.main?.App) {
      try {
        await window.go.main.App.ConnectPeer(id);
        addToast('Connected to peer');
      } catch {}
    }
    setConnecting(false);
  };

  const filteredPeers = peers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.virtual_ip.includes(searchQuery)
  );

  return (
    <div className="app-shell">
      <div className="app-drag-region" />
      
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <nav className="app-sidebar">
        <div className="brand-glyph">Z</div>
        
        <button
          className={`nav-item ${page === 'home' ? 'active' : ''}`}
          onClick={() => setPage('home')}
        >
          <Icon d={Icons.home} />
        </button>
        <button
          className={`nav-item ${page === 'peers' ? 'active' : ''}`}
          onClick={() => setPage('peers')}
        >
          <Icon d={Icons.globe} />
          {peers.filter(p => p.online).length > 0 && <span className="nav-badge" />}
        </button>
        <button
          className={`nav-item ${page === 'activity' ? 'active' : ''}`}
          onClick={() => setPage('activity')}
        >
          <Icon d={Icons.activity} />
        </button>
        <button
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => setPage('settings')}
        >
          <Icon d={Icons.settings} />
        </button>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="app-content">
        
        {/* HOME VIEW: Ultra Minimalist Toggle */}
        {page === 'home' && (
          <>
            <div className="home-center-stage">
              <div className={`status-label ${connecting ? 'connecting' : status.connected ? 'protected' : ''}`}>
                {connecting ? 'Connecting...' : status.connected ? 'Protected' : 'Not Connected'}
              </div>

              <div
                className={`hero-toggle ${status.connected ? 'on' : ''}`}
                onClick={!connecting ? toggleTunnel : undefined}
                style={{ opacity: connecting ? 0.7 : 1 }}
              >
                <div className="hero-toggle-knob"></div>
              </div>

              {status.connected && (
                <div className="hero-details">
                  <div className="detail-line">
                    <span className="detail-label">Virtual IP</span>
                    <span className="detail-val tabular">{status.assigned_ip}</span>
                  </div>
                  <div className="detail-line">
                    <span className="detail-label">Gateway</span>
                    <span className="detail-val">{status.active_peer_name || 'Direct'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Footer Telemetry only shown when connected */}
            {status.connected && (
              <div className="status-footer">
                <div className="status-footer-left">
                  <span className="metric">
                    <Icon d={Icons.download} size={12} />
                    <span className="metric-val tabular">{(telemetry.download_rate_kbps / 1024).toFixed(1)} MB/s</span>
                  </span>
                  <span className="metric">
                    <Icon d={Icons.upload} size={12} />
                    <span className="metric-val tabular">{(telemetry.upload_rate_kbps / 1024).toFixed(1)} MB/s</span>
                  </span>
                </div>
                <div className="status-footer-right">
                  <span className="metric">
                    <span className="metric-val tabular">{telemetry.latency_ms} ms</span> ping
                  </span>
                  <span>{telemetry.path_type} ({telemetry.nat_type})</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* PEERS VIEW: Borderless List */}
        {page === 'peers' && (
          <div className="content-scroll">
            <h1 className="page-title">Network Peers</h1>
            <p className="page-subtitle">Available endpoints on your Zoop mesh.</p>

            <input
              type="text"
              className="seamless-input"
              placeholder="Filter endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 32 }}
            />

            <div className="list-container">
              {filteredPeers.map((peer) => (
                <div key={peer.id} className="list-row" onClick={() => {
                  if (status.active_peer_id === peer.id) toggleTunnel();
                  else connectToPeer(peer.id);
                }}>
                  <div className="list-row-icon">
                    {peer.online ? <Icon d={Icons.check} /> : <Icon d={Icons.power} />}
                  </div>
                  <div className="list-row-body">
                    <span className="row-title">{peer.name}</span>
                    <span className="row-sub">
                      <span className="tabular">{peer.virtual_ip}</span>
                      <span>·</span>
                      <span>{peer.city}, {peer.country}</span>
                    </span>
                  </div>
                  <div className="row-right">
                    {peer.online && (
                      <span className={`pill ${peer.latency_ms < 50 ? 'green' : 'yellow'} tabular`}>
                        {peer.latency_ms} ms
                      </span>
                    )}
                    {peer.is_provider && <span className="pill blue">Provider</span>}
                    <div className="row-action">
                      {status.active_peer_id === peer.id ? (
                        <span style={{ color: 'var(--red)', fontSize: 12, fontWeight: 500 }}>Disconnect</span>
                      ) : (
                        <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>Connect</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredPeers.length === 0 && (
                <div style={{ color: 'var(--text-muted)', marginTop: 24 }}>No peers found.</div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY VIEW: Borderless List */}
        {page === 'activity' && (
          <div className="content-scroll">
            <h1 className="page-title">Activity</h1>
            <p className="page-subtitle">Connection history and system events.</p>

            <div className="list-container">
              {events.map((evt) => (
                <div key={evt.id} className="list-row" style={{ cursor: 'default' }}>
                  <div className="list-row-icon" style={{ color: evt.level === 'error' ? 'var(--red)' : evt.level === 'success' ? 'var(--emerald)' : 'var(--text-muted)' }}>
                    <Icon d={Icons.activity} />
                  </div>
                  <div className="list-row-body">
                    <span className="row-title">{evt.title}</span>
                    <span className="row-sub">{evt.description}</span>
                  </div>
                  <div className="row-right">
                    <span className="row-sub tabular">{evt.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS VIEW: Clean Forms */}
        {page === 'settings' && (
          <div className="content-scroll">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Configure Zoop endpoint preferences.</p>

            <div className="settings-group">
              <div className="settings-label">Routing & Network</div>
              
              <div className="list-row" onClick={() => setSettings(s => ({ ...s, auto_connect: !s.auto_connect }))}>
                <div className="list-row-body">
                  <span className="row-title">Auto-Connect on Launch</span>
                  <span className="row-sub">Establish tunnel immediately when the app opens</span>
                </div>
                <div className="row-right">
                  <span className={`pill ${settings.auto_connect ? 'green' : ''}`}>
                    {settings.auto_connect ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              <div className="list-row" onClick={() => setSettings(s => ({ ...s, kill_switch: !s.kill_switch }))}>
                <div className="list-row-body">
                  <span className="row-title">Network Kill Switch</span>
                  <span className="row-sub">Block all unencrypted traffic if tunnel drops</span>
                </div>
                <div className="row-right">
                  <span className={`pill ${settings.kill_switch ? 'green' : ''}`}>
                    {settings.kill_switch ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              
              <div className="list-row" onClick={() => setSettings(s => ({ ...s, allow_local_lan: !s.allow_local_lan }))}>
                <div className="list-row-body">
                  <span className="row-title">Allow Local LAN</span>
                  <span className="row-sub">Access local network devices (192.168.x.x)</span>
                </div>
                <div className="row-right">
                  <span className={`pill ${settings.allow_local_lan ? 'green' : ''}`}>
                    {settings.allow_local_lan ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <div className="settings-label">Advanced</div>
              
              <div style={{ marginBottom: 24 }}>
                <span className="row-title" style={{ display: 'block', marginBottom: 8 }}>DNS Resolvers</span>
                <input
                  type="text"
                  className="seamless-input"
                  style={{ fontSize: 16 }}
                  value={settings.dns_servers.join(', ')}
                  onChange={(e) => setSettings(s => ({ ...s, dns_servers: e.target.value.split(',').map(x=>x.trim()) }))}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <span className="row-title" style={{ display: 'block', marginBottom: 8 }}>Control Plane URL</span>
                <input
                  type="text"
                  className="seamless-input"
                  style={{ fontSize: 16 }}
                  value={settings.control_plane_url}
                  onChange={(e) => setSettings(s => ({ ...s, control_plane_url: e.target.value }))}
                />
              </div>

              <button className="btn btn-primary" onClick={() => {
                if (window.go?.main?.App) window.go.main.App.SaveSettings(settings);
                addToast('Settings saved');
              }}>
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Toasts ──────────────────────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
};
