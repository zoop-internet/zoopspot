import React, { useState, useEffect } from 'react';
import type { DesktopPeerInfo, DesktopStatus, DesktopTelemetry, DesktopDiagnosticsReport, DesktopSettings } from './types';
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
          SaveSettings: (settings: DesktopSettings) => Promise<boolean>;
        };
      };
    };
  }
}

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

export const App: React.FC = () => {
  const [tab, setTab] = useState<'mesh' | 'share' | 'diagnostics'>('mesh');
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
          { name: 'WireGuard TUN Device', passed: true, latency_ms: 1, message: 'Interface zoop0 active with MTU 1420' },
          { name: 'Cloud Signaling', passed: true, latency_ms: 14, message: 'Connected to Control Plane (localhost:8080)' },
          { name: 'STUN Discovery', passed: true, latency_ms: 22, message: 'Public endpoint mapped via STUN' },
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
    <div className="desktop-app-container">
      {/* ─── Window Header / Titlebar ────────────────────────── */}
      <header className="app-titlebar">
        <div className="titlebar-brand">
          <span style={{ color: 'var(--accent-cyan)' }}>●</span>
          <span>Zoop</span>
          <span className="badge">Desktop Client</span>
        </div>

        <div className="titlebar-tabs">
          <button
            className={`tab-btn ${tab === 'mesh' ? 'active' : ''}`}
            onClick={() => setTab('mesh')}
          >
            My Mesh
          </button>
          <button
            className={`tab-btn ${tab === 'share' ? 'active' : ''}`}
            onClick={() => setTab('share')}
          >
            Share Internet
          </button>
          <button
            className={`tab-btn ${tab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setTab('diagnostics')}
          >
            Diagnostics
          </button>
        </div>

        <div className="titlebar-right">
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => window.open?.('https://app.zoop.network', '_blank')}
            title="Open Web Admin Console"
          >
            Web Portal ↗
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ─── Application Body ─────────────────────────────────── */}
      <div className="app-content">
        {/* Left Sidebar */}
        <aside className="app-sidebar">
          <div>
            <div className="device-card">
              <div className="device-header">
                <span className="device-label">This Machine</span>
                <span className={`pill ${status.connected ? 'green' : 'muted'}`}>
                  {status.connected ? 'Secured' : 'Offline'}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{settings.device_name}</div>
              <div className="device-ip">{status.assigned_ip}</div>
            </div>

            <div className="connect-trigger-box">
              <button
                id="desktop-connect-btn"
                className={`connect-action-btn ${
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
                  'Negotiating Tunnel...'
                ) : status.connected ? (
                  <>✓ Disconnect Tunnel</>
                ) : (
                  <>⚡ Connect to Mesh</>
                )}
              </button>

              {status.connected && status.active_peer_name && (
                <div className="route-notice">
                  Connected via: <strong>{status.active_peer_name}</strong>
                </div>
              )}
            </div>

            <div className="panel" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Provider Sharing
                </span>
                <span className={`pill ${isProviderActive ? 'cyan' : 'muted'}`}>
                  {isProviderActive ? 'Sharing' : 'Off'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {isProviderActive ? 'Local internet accessible by authorized peers' : 'Not sharing local internet'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Zoop Desktop v{status.version}
          </div>
        </aside>

        {/* Right Main View */}
        <main className="app-view">
          {/* Real-Time Telemetry Ribbon */}
          <div className="metrics-ribbon">
            <div className="metric-card">
              <div className="metric-title">Download</div>
              <div className="metric-val">
                {status.connected ? `${telemetry.download_rate_kbps.toFixed(1)} KB/s` : '0.0 KB/s'}
              </div>
              <div className="metric-sub">Rx: {(telemetry.total_rx_bytes / 1024 / 1024).toFixed(1)} MB</div>
            </div>

            <div className="metric-card">
              <div className="metric-title">Upload</div>
              <div className="metric-val">
                {status.connected ? `${telemetry.upload_rate_kbps.toFixed(1)} KB/s` : '0.0 KB/s'}
              </div>
              <div className="metric-sub">Tx: {(telemetry.total_tx_bytes / 1024 / 1024).toFixed(1)} MB</div>
            </div>

            <div className="metric-card">
              <div className="metric-title">Latency Ping</div>
              <div
                className="metric-val"
                style={{ color: telemetry.latency_ms > 0 && telemetry.latency_ms < 50 ? 'var(--accent-green)' : 'var(--text-primary)' }}
              >
                {status.connected ? `${telemetry.latency_ms.toFixed(1)} ms` : '--'}
              </div>
              <div className="metric-sub">Route: {telemetry.path_type.toUpperCase()}</div>
            </div>

            <div className="metric-card">
              <div className="metric-title">Tunnel Interface</div>
              <div className="metric-val" style={{ fontSize: 13 }}>
                WireGuard ({status.tunnel_if_name})
              </div>
              <div className="metric-sub">{telemetry.nat_type}</div>
            </div>
          </div>

          {/* Tab 1: Peers */}
          {tab === 'mesh' && (
            <section>
              <div className="section-header">
                <span className="section-h2">Mesh Peers & Gateways</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{peers.length} Endpoints Active</span>
              </div>

              <div className="peer-list">
                {peers.map(p => (
                  <div key={p.id} className={`peer-box ${status.active_peer_id === p.id ? 'active' : ''}`}>
                    <div className="peer-top">
                      <div>
                        <div className="peer-heading">{p.name}</div>
                        <div className="peer-subheading">{p.city}, {p.country}</div>
                      </div>
                      <span className={`pill ${p.online ? 'green' : 'muted'}`}>
                        {p.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="peer-stats">
                      <span>{p.virtual_ip}</span>
                      <span>•</span>
                      <span>{p.latency_ms} ms</span>
                      <span className={`tag ${p.direct_available ? 'direct' : 'relay'}`}>
                        {p.direct_available ? 'Direct P2P' : 'Relay'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      {status.active_peer_id === p.id ? (
                        <button className="btn btn-danger" onClick={handleToggleConnect}>
                          Disconnect
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={() => handleConnectSpecific(p)}>
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tab 2: Sharing */}
          {tab === 'share' && (
            <section>
              <div className="section-header">
                <span className="section-h2">Internet Sharing (Provider Mode)</span>
              </div>

              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Share this device's internet connection securely with your authorized personal devices or invited peers. All relay and direct traffic is end-to-end encrypted with WireGuard.
                </p>

                <div className="toggle-item" style={{ background: '#0e0e0e', padding: '12px 14px', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Enable Provider Mode</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allow mesh peers to route internet through this PC</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isProviderActive}
                    onChange={e => setIsProviderActive(e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>

                {isProviderActive && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                    <div className="panel" style={{ background: '#070707' }}>
                      <div className="metric-title">Connected Consumers</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>2 Active</div>
                      <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 2 }}>MacBook Air, Pixel 8</div>
                    </div>

                    <div className="panel" style={{ background: '#070707' }}>
                      <div className="metric-title">Data Provided Today</div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>1.42 GB</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Quota: Unlimited</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Tab 3: Diagnostics */}
          {tab === 'diagnostics' && (
            <section>
              <div className="section-header">
                <span className="section-h2">System Diagnostics</span>
                <button className="btn btn-secondary" onClick={runDiagnosticsProbe} disabled={isRunningDiag}>
                  {isRunningDiag ? 'Probing...' : '⚡ Run Diagnostics'}
                </button>
              </div>

              <div className="panel">
                {diagnostics ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span className={`pill ${diagnostics.healthy ? 'green' : 'muted'}`}>
                        {diagnostics.healthy ? 'All Probes Passed' : 'Issues Detected'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Tested: {new Date(diagnostics.diagnostic_time_rfc).toLocaleTimeString()}
                      </span>
                    </div>

                    {diagnostics.checks.map((c, i) => (
                      <div key={i} className="toggle-item">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.message}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.passed ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                          {c.passed ? '✓ OK' : '⚠ WARN'}
                        </span>
                      </div>
                    ))}

                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        System Log:
                      </div>
                      {diagnostics.details.map((d, i) => (
                        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          • {d}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                    Click <strong>"Run Diagnostics"</strong> to probe local WireGuard adapters, STUN routing, and Cloud signaling.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ─── Settings Modal ───────────────────────────────────── */}
      {showSettings && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Desktop Preferences</span>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="toggle-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Auto-Connect on Startup</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Establish tunnel on computer boot</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_connect}
                  onChange={e => setSettings({ ...settings, auto_connect: e.target.checked })}
                />
              </div>

              <div className="toggle-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Kill Switch</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Block traffic if tunnel drops</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.kill_switch}
                  onChange={e => setSettings({ ...settings, kill_switch: e.target.checked })}
                />
              </div>

              <div className="toggle-item">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Local LAN Access</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allow access to local printers & NAS</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allow_local_lan}
                  onChange={e => setSettings({ ...settings, allow_local_lan: e.target.checked })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Device Name
                </label>
                <input
                  type="text"
                  value={settings.device_name}
                  onChange={e => setSettings({ ...settings, device_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Encrypted DNS Resolvers (Comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.dns_servers.join(', ')}
                  onChange={e => setSettings({ ...settings, dns_servers: e.target.value.split(',').map(s => s.trim()) })}
                  style={{ width: '100%', padding: '8px 10px', background: '#111', border: '1px solid var(--border)', borderRadius: 6, color: '#fff', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
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
