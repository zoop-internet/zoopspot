import React, { useState, useEffect } from 'react';
import type { PortalMode, DesktopPeerInfo, DesktopStatus, DesktopTelemetry, DesktopDiagnosticsReport, DesktopSettings } from '../types';
import './DesktopClient.css';

/* ─── Wails Runtime Bridge Interface ──────────────────────────── */
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
          SaveSettings: (settings: DesktopSettings) => Promise<boolean>;
        };
      };
    };
  }
}

/* ─── Default Fallbacks (when previewed in dev) ────────────────── */
const DEFAULT_STATUS: DesktopStatus = {
  connected: false,
  state: 'idle',
  assigned_ip: '100.64.0.5',
  public_ip: '198.51.100.12',
  tunnel_if_name: 'zoop0',
  version: '1.0.0',
};

const DEFAULT_PEERS: DesktopPeerInfo[] = [
  {
    id: '42a1bc23-83d4-4e12-b2d9-123456789abc',
    name: 'Home Gateway (Ashburn)',
    platform: 'linux',
    virtual_ip: '100.64.0.1',
    is_provider: true,
    online: true,
    latency_ms: 18.4,
    direct_available: true,
    country: 'United States',
    city: 'Ashburn, VA',
  },
  {
    id: '88d2ef56-12c8-47a3-98b7-987654321def',
    name: 'Frankfurt Exit Node',
    platform: 'linux',
    virtual_ip: '100.64.0.2',
    is_provider: true,
    online: true,
    latency_ms: 86.2,
    direct_available: true,
    country: 'Germany',
    city: 'Frankfurt',
  },
  {
    id: 'c3f4129a-55bc-4321-89ab-abcdef123456',
    name: 'My MacBook Pro',
    platform: 'darwin',
    virtual_ip: '100.64.0.4',
    is_provider: false,
    online: true,
    latency_ms: 12.1,
    direct_available: true,
    country: 'United States',
    city: 'New York, NY',
  },
  {
    id: '77e1aa22-33cc-4999-aaaa-112233445566',
    name: 'Tokyo Community Node',
    platform: 'linux',
    virtual_ip: '100.64.0.10',
    is_provider: true,
    online: true,
    latency_ms: 142.5,
    direct_available: false,
    country: 'Japan',
    city: 'Tokyo',
  },
];

interface DesktopClientProps {
  mode: PortalMode;
  onSwitch: (m: PortalMode) => void;
}

export const DesktopClient: React.FC<DesktopClientProps> = ({ onSwitch }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'share' | 'diagnostics'>('network');
  const [status, setStatus] = useState<DesktopStatus>(DEFAULT_STATUS);
  const [peers, setPeers] = useState<DesktopPeerInfo[]>(DEFAULT_PEERS);
  const [telemetry, setTelemetry] = useState<DesktopTelemetry>({
    download_rate_kbps: 0,
    upload_rate_kbps: 0,
    total_rx_bytes: 0,
    total_tx_bytes: 0,
    latency_ms: 0,
    packet_loss_pct: 0,
    path_type: 'none',
    nat_type: 'Full Cone NAT',
  });

  const [isProviderActive, setIsProviderActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DesktopDiagnosticsReport | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const [settings, setSettings] = useState<DesktopSettings>({
    auto_connect: false,
    kill_switch: true,
    allow_local_lan: true,
    dns_servers: ['1.1.1.1', '1.0.0.1'],
    control_plane_url: 'http://localhost:8080',
    device_name: 'Workstation Desktop',
    tunnel_if_name: 'zoop0',
  });

  // Sync state with native Wails backend if available
  useEffect(() => {
    const fetchStatus = async () => {
      if (window.go?.main?.App) {
        try {
          const s = await window.go.main.App.GetStatus();
          setStatus(s);
          const p = await window.go.main.App.GetPeers();
          setPeers(p);
          const t = await window.go.main.App.GetTelemetry();
          setTelemetry(t);
        } catch (e) {
          console.error('Wails sync error:', e);
        }
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleConnect = async () => {
    setIsConnecting(true);
    if (status.connected) {
      if (window.go?.main?.App) {
        const s = await window.go.main.App.Disconnect();
        setStatus(s);
      } else {
        setStatus(prev => ({ ...prev, connected: false, state: 'idle', active_peer_id: undefined, active_peer_name: undefined }));
        setTelemetry(prev => ({ ...prev, download_rate_kbps: 0, upload_rate_kbps: 0, latency_ms: 0 }));
      }
    } else {
      if (window.go?.main?.App) {
        const s = await window.go.main.App.ConnectPeer('');
        setStatus(s);
      } else {
        setStatus(prev => ({
          ...prev,
          connected: true,
          state: 'connected',
          active_peer_id: peers[0]?.id,
          active_peer_name: peers[0]?.name,
          connected_since: new Date().toISOString(),
        }));
        setTelemetry(prev => ({
          ...prev,
          download_rate_kbps: 2150.8,
          upload_rate_kbps: 580.3,
          total_rx_bytes: 142095810,
          total_tx_bytes: 35190280,
          latency_ms: 18.4,
          path_type: 'direct',
        }));
      }
    }
    setIsConnecting(false);
  };

  const handleConnectSpecific = async (peer: DesktopPeerInfo) => {
    setIsConnecting(true);
    if (window.go?.main?.App) {
      const s = await window.go.main.App.ConnectPeer(peer.id);
      setStatus(s);
    } else {
      setStatus(prev => ({
        ...prev,
        connected: true,
        state: 'connected',
        active_peer_id: peer.id,
        active_peer_name: peer.name,
        connected_since: new Date().toISOString(),
      }));
      setTelemetry(prev => ({
        ...prev,
        download_rate_kbps: 1820.5,
        upload_rate_kbps: 420.1,
        latency_ms: peer.latency_ms,
        path_type: peer.direct_available ? 'direct' : 'relay',
      }));
    }
    setIsConnecting(false);
  };

  const runDiagnosticsProbe = async () => {
    setIsRunningDiag(true);
    if (window.go?.main?.App) {
      const res = await window.go.main.App.RunDiagnostics();
      setDiagnostics(res);
    } else {
      await new Promise(r => setTimeout(r, 1000));
      setDiagnostics({
        healthy: true,
        checks: [
          { name: 'WireGuard TUN Device', passed: true, latency_ms: 1, message: 'Interface zoop0 up with MTU 1420' },
          { name: 'Cloud Signaling', passed: true, latency_ms: 14, message: 'Connected to Control Plane (localhost:8080)' },
          { name: 'STUN Discovery', passed: true, latency_ms: 22, message: 'Public Endpoint mapped via STUN' },
          { name: 'NAT Traversal', passed: true, latency_ms: 22, message: 'Direct P2P capable (Full Cone)' },
        ],
        details: [
          'WireGuard crypto backend: OK (Ed25519 / ChaCha20)',
          'Local IP: 100.64.0.5',
          'Routing table: Table 200 configured',
        ],
        diagnostic_time_rfc: new Date().toISOString(),
      });
    }
    setIsRunningDiag(false);
  };

  return (
    <div className="desktop-app">
      {/* ─── Compact Desktop Titlebar ─────────────────────────── */}
      <header className="desktop-titlebar">
        <div className="titlebar-brand">
          <span style={{ color: 'var(--accent-cyan)' }}>●</span>
          <span>Zoop</span>
          <span className="logo-badge">Desktop</span>
        </div>

        <div className="titlebar-center">
          <button
            className={`titlebar-nav-btn ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            Network & Peers
          </button>
          <button
            className={`titlebar-nav-btn ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            Internet Sharing
          </button>
          <button
            className={`titlebar-nav-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            Diagnostics
          </button>
        </div>

        <div className="titlebar-actions">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onSwitch('user')}
            title="Open Web Management Console"
          >
            Web Console ↗
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setShowSettings(true)}
            title="Client Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ─── Desktop Content Body ─────────────────────────────── */}
      <div className="desktop-body">
        {/* ─── Left Sidebar: Quick Actions & Status ───────────── */}
        <aside className="desktop-sidebar">
          <div>
            {/* Device Identity Card */}
            <div className="device-hero-card">
              <div className="device-hero-header">
                <span className="device-hero-title">This Device</span>
                <span className={`status-pill ${status.connected ? 'pill-green' : 'pill-muted'}`}>
                  {status.connected ? 'Secured' : 'Offline'}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{settings.device_name}</div>
              <div className="device-ip-badge">{status.assigned_ip}</div>
            </div>

            {/* 1-Click Connection Action */}
            <div className="tunnel-state-toggle-container">
              <button
                id="desktop-connect-toggle"
                className={`big-connect-btn ${
                  isConnecting
                    ? 'connecting'
                    : status.connected
                    ? 'connected'
                    : 'disconnected'
                }`}
                onClick={handleToggleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  'Connecting...'
                ) : status.connected ? (
                  <>✓ Disconnect Tunnel</>
                ) : (
                  <>⚡ Connect to Zoop</>
                )}
              </button>

              {status.connected && status.active_peer_name && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
                  Exit: <strong>{status.active_peer_name}</strong>
                </div>
              )}
            </div>

            {/* Quick Sharing Status Indicator */}
            <div style={{ background: '#0e0e0e', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>SHARING (PROVIDER)</span>
                <span className={`status-pill ${isProviderActive ? 'pill-cyan' : 'pill-muted'}`}>
                  {isProviderActive ? 'Active' : 'Off'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isProviderActive ? 'Sharing internet with authorized peers' : 'Not sharing local internet'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Zoop Client v{status.version}
          </div>
        </aside>

        {/* ─── Main View ──────────────────────────────────────── */}
        <main className="desktop-main">
          {/* Real-Time Telemetry Ribbon */}
          <div className="telemetry-ribbon">
            <div className="telemetry-tile">
              <div className="telemetry-tile-label">Download Speed</div>
              <div className="telemetry-tile-value">
                {status.connected ? `${telemetry.download_rate_kbps.toFixed(1)} KB/s` : '0.0 KB/s'}
              </div>
              <div className="telemetry-tile-sub">Rx: {(telemetry.total_rx_bytes / 1024 / 1024).toFixed(1)} MB</div>
            </div>

            <div className="telemetry-tile">
              <div className="telemetry-tile-label">Upload Speed</div>
              <div className="telemetry-tile-value">
                {status.connected ? `${telemetry.upload_rate_kbps.toFixed(1)} KB/s` : '0.0 KB/s'}
              </div>
              <div className="telemetry-tile-sub">Tx: {(telemetry.total_tx_bytes / 1024 / 1024).toFixed(1)} MB</div>
            </div>

            <div className="telemetry-tile">
              <div className="telemetry-tile-label">Ping Latency</div>
              <div
                className="telemetry-tile-value"
                style={{ color: telemetry.latency_ms > 0 && telemetry.latency_ms < 50 ? 'var(--accent-green)' : 'var(--text-primary)' }}
              >
                {status.connected ? `${telemetry.latency_ms.toFixed(1)} ms` : '--'}
              </div>
              <div className="telemetry-tile-sub">Path: {telemetry.path_type.toUpperCase()}</div>
            </div>

            <div className="telemetry-tile">
              <div className="telemetry-tile-label">Tunnel Type</div>
              <div className="telemetry-tile-value" style={{ fontSize: 13 }}>
                WireGuard P2P
              </div>
              <div className="telemetry-tile-sub">{telemetry.nat_type}</div>
            </div>
          </div>

          {/* ─── Tab 1: Network & Peers ───────────────────────── */}
          {activeTab === 'network' && (
            <section>
              <div className="section-head">
                <span className="section-title">My Mesh & Gateways</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {peers.length} Devices Available
                </span>
              </div>

              <div className="peer-grid">
                {peers.map(p => (
                  <div key={p.id} className={`peer-card ${status.active_peer_id === p.id ? 'active-peer' : ''}`}>
                    <div className="peer-card-header">
                      <div>
                        <div className="peer-name">{p.name}</div>
                        <div className="peer-location">{p.city}, {p.country}</div>
                      </div>
                      <span className={`status-pill ${p.online ? 'pill-green' : 'pill-muted'}`}>
                        {p.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="peer-meta">
                      <span>{p.virtual_ip}</span>
                      <span>•</span>
                      <span>{p.latency_ms} ms</span>
                      <span className={`peer-meta-badge ${p.direct_available ? 'direct' : 'relay'}`}>
                        {p.direct_available ? 'Direct P2P' : 'Relay'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      {status.active_peer_id === p.id ? (
                        <button className="btn btn-danger btn-xs" onClick={handleToggleConnect}>
                          Disconnect
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-xs" onClick={() => handleConnectSpecific(p)}>
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Tab 2: Sharing / Provider Controls ───────────── */}
          {activeTab === 'share' && (
            <section>
              <div className="section-head">
                <span className="section-title">Internet Sharing (Provider Mode)</span>
              </div>

              <div className="diagnostics-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Turn this computer into an encrypted Zoop Provider node. Authorized friends, family, or your own remote devices can route their internet through your connection.
                </p>

                <div className="setting-toggle-row" style={{ background: '#111', padding: '12px 16px', borderRadius: 8 }}>
                  <div className="setting-info">
                    <span className="setting-title">Enable Provider Mode</span>
                    <span className="setting-desc">Allow authorized peers to use this machine's internet</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isProviderActive}
                    onChange={e => setIsProviderActive(e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                {isProviderActive && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#0e0e0e', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Connected Peers</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>2 Devices</div>
                      <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 2 }}>MacBook Air, iPad Pro</div>
                    </div>

                    <div style={{ background: '#0e0e0e', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shared Data Today</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>1.42 GB</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Quota: Unlimited</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─── Tab 3: Doctor Diagnostics ───────────────────── */}
          {activeTab === 'diagnostics' && (
            <section>
              <div className="section-head">
                <span className="section-title">Doctor Diagnostics Probe</span>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={runDiagnosticsProbe}
                  disabled={isRunningDiag}
                >
                  {isRunningDiag ? 'Probing...' : '⚡ Run Diagnostics'}
                </button>
              </div>

              <div className="diagnostics-panel">
                {diagnostics ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <span className={`status-pill ${diagnostics.healthy ? 'pill-green' : 'pill-amber'}`}>
                        {diagnostics.healthy ? 'System Ready & Healthy' : 'Degraded Components'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Tested: {new Date(diagnostics.diagnostic_time_rfc).toLocaleTimeString()}
                      </span>
                    </div>

                    {diagnostics.checks.map((chk, idx) => (
                      <div key={idx} className="diag-item">
                        <div>
                          <div className="diag-label">{chk.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{chk.message}</div>
                        </div>
                        <div className={`diag-status ${chk.passed ? 'ok' : 'warn'}`}>
                          {chk.passed ? '✓ OK' : '⚠ WARNING'}
                        </div>
                      </div>
                    ))}

                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Diagnostic Details:
                      </div>
                      {diagnostics.details.map((d, idx) => (
                        <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          • {d}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                    Click <strong>"Run Diagnostics"</strong> to check local WireGuard interfaces, STUN routing, and Control Plane connectivity.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ─── Settings Modal ───────────────────────────────────── */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Client Settings</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div className="desktop-settings-form">
              <div className="setting-toggle-row">
                <div className="setting-info">
                  <span className="setting-title">Auto-Connect on Startup</span>
                  <span className="setting-desc">Connect tunnel automatically when computer boots</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_connect}
                  onChange={e => setSettings({ ...settings, auto_connect: e.target.checked })}
                />
              </div>

              <div className="setting-toggle-row">
                <div className="setting-info">
                  <span className="setting-title">Kill Switch</span>
                  <span className="setting-desc">Block internet traffic if tunnel connection is lost</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.kill_switch}
                  onChange={e => setSettings({ ...settings, kill_switch: e.target.checked })}
                />
              </div>

              <div className="setting-toggle-row">
                <div className="setting-info">
                  <span className="setting-title">Allow Local LAN Access</span>
                  <span className="setting-desc">Keep local printers and NAS devices reachable</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_local_lan}
                  onChange={e => setSettings({ ...settings, allow_local_lan: e.target.checked })}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Device Name
                </label>
                <input
                  type="text"
                  value={settings.device_name}
                  onChange={e => setSettings({ ...settings, device_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: '#fff' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Custom Encrypted DNS
                </label>
                <input
                  type="text"
                  value={settings.dns_servers.join(', ')}
                  onChange={e => setSettings({ ...settings, dns_servers: e.target.value.split(',').map(s => s.trim()) })}
                  style={{ width: '100%', padding: '8px 12px', background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (window.go?.main?.App) {
                      await window.go.main.App.SaveSettings(settings);
                    }
                    setShowSettings(false);
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
