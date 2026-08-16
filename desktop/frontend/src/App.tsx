import React, { useState, useEffect, useCallback } from 'react';
import type { DesktopPeerInfo, DesktopStatus, DesktopTelemetry, DesktopDiagnosticsReport, DesktopSettings } from './types';
import './style.css';

declare global {
  interface Window {
    go?: { main?: { App?: {
      GetStatus:    () => Promise<DesktopStatus>;
      ConnectPeer:  (id: string) => Promise<DesktopStatus>;
      Disconnect:   () => Promise<DesktopStatus>;
      GetPeers:     () => Promise<DesktopPeerInfo[]>;
      RunDiagnostics: () => Promise<DesktopDiagnosticsReport>;
      GetTelemetry: () => Promise<DesktopTelemetry>;
      GetSettings:  () => Promise<DesktopSettings>;
      SaveSettings: (s: DesktopSettings) => Promise<boolean>;
    }}}
  }
}

/* ── Types ─────────────────────────────────────────────────── */
type NavPage = 'home' | 'peers' | 'share' | 'diagnostics' | 'settings';

/* ── Mock Data ─────────────────────────────────────────────── */
const MOCK_STATUS: DesktopStatus = {
  connected: false, state: 'idle',
  assigned_ip: '100.64.0.5', public_ip: '198.51.100.12',
  tunnel_if_name: 'zoop0', version: '1.0.0',
};

const MOCK_PEERS: DesktopPeerInfo[] = [
  { id: 'p1', name: 'Home Gateway', platform: 'linux', virtual_ip: '100.64.0.1',
    is_provider: true, online: true, latency_ms: 18, direct_available: true,
    country: 'United States', city: 'Ashburn, VA' },
  { id: 'p2', name: 'Frankfurt Exit Node', platform: 'linux', virtual_ip: '100.64.0.2',
    is_provider: true, online: true, latency_ms: 86, direct_available: true,
    country: 'Germany', city: 'Frankfurt' },
  { id: 'p3', name: 'Tokyo Community Node', platform: 'linux', virtual_ip: '100.64.0.10',
    is_provider: true, online: true, latency_ms: 143, direct_available: false,
    country: 'Japan', city: 'Tokyo' },
  { id: 'p4', name: 'My MacBook Pro', platform: 'darwin', virtual_ip: '100.64.0.4',
    is_provider: false, online: true, latency_ms: 12, direct_available: true,
    country: 'United States', city: 'New York, NY' },
  { id: 'p5', name: 'Singapore Relay', platform: 'linux', virtual_ip: '100.64.0.20',
    is_provider: true, online: false, latency_ms: 210, direct_available: false,
    country: 'Singapore', city: 'Singapore' },
];

const MOCK_TEL: DesktopTelemetry = {
  download_rate_kbps: 0, upload_rate_kbps: 0,
  total_rx_bytes: 0, total_tx_bytes: 0,
  latency_ms: 0, packet_loss_pct: 0,
  path_type: 'none', nat_type: 'Full Cone NAT',
};

/* ── Country → Flag emoji ──────────────────────────────────── */
const flag: Record<string, string> = {
  'United States': '🇺🇸', 'Germany': '🇩🇪', 'Japan': '🇯🇵',
  'Singapore': '🇸🇬', 'United Kingdom': '🇬🇧', 'France': '🇫🇷',
};

/* ── SVG Icons ─────────────────────────────────────────────── */
const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  home:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  peers:   'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  share:   'M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  diag:    'M22 12h-4l-3 9L9 3l-3 9H2',
  settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  power:   'M18.36 6.64a9 9 0 1 1-12.73 0 M12 2v10',
  shield:  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  activity:'M22 12h-4l-3 9L9 3l-3 9H2',
  check:   'M20 6L9 17l-5-5',
  alert:   'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
  arrow:   'M7 17L17 7 M7 7h10v10',
  zap:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
};

/* ── Latency helpers ───────────────────────────────────────── */
const latencyClass = (ms: number) => ms < 40 ? 'fast' : ms < 100 ? 'ok' : 'slow';
const fmtBytes = (b: number) => b < 1024 ? `${b} B`
  : b < 1024**2 ? `${(b/1024).toFixed(1)} KB`
  : b < 1024**3 ? `${(b/1024**2).toFixed(1)} MB`
  : `${(b/1024**3).toFixed(2)} GB`;

/* ═══════════════════════════════════════════════════════════
   App Component
   ═══════════════════════════════════════════════════════════ */
export const App: React.FC = () => {
  const [page, setPage]   = useState<NavPage>('home');
  const [status, setStatus] = useState<DesktopStatus>(MOCK_STATUS);
  const [peers,  setPeers]  = useState<DesktopPeerInfo[]>(MOCK_PEERS);
  const [tel,    setTel]    = useState<DesktopTelemetry>(MOCK_TEL);
  const [diag,   setDiag]   = useState<DesktopDiagnosticsReport | null>(null);
  const [settings, setSettings] = useState<DesktopSettings>({
    auto_connect: false, kill_switch: true, allow_local_lan: true,
    dns_servers: ['1.1.1.1', '1.0.0.1'],
    control_plane_url: 'http://localhost:8080',
    device_name: 'My Desktop', tunnel_if_name: 'zoop0',
  });

  const [connecting, setConnecting]   = useState(false);
  const [providerOn, setProviderOn]   = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);

  // Backend sync
  useEffect(() => {
    const sync = async () => {
      if (!window.go?.main?.App) return;
      try {
        setStatus(await window.go.main.App.GetStatus());
        setPeers(await window.go.main.App.GetPeers());
        setTel(await window.go.main.App.GetTelemetry());
      } catch {}
    };
    sync();
    const t = setInterval(sync, 2000);
    return () => clearInterval(t);
  }, []);

  /* ── Connect / Disconnect ─────────────────────────────────── */
  const toggleTunnel = useCallback(async () => {
    setConnecting(true);
    if (status.connected) {
      if (window.go?.main?.App) setStatus(await window.go.main.App.Disconnect());
      else {
        setStatus(p => ({ ...p, connected: false, state: 'idle', active_peer_id: undefined, active_peer_name: undefined }));
        setTel(MOCK_TEL);
      }
    } else {
      if (window.go?.main?.App) setStatus(await window.go.main.App.ConnectPeer(''));
      else {
        const first = peers.find(p => p.online && p.is_provider);
        setStatus(p => ({ ...p, connected: true, state: 'connected',
          active_peer_id: first?.id, active_peer_name: first?.name,
          connected_since: new Date().toISOString() }));
        setTel({ download_rate_kbps: 2340, upload_rate_kbps: 610,
          total_rx_bytes: 142_095_810, total_tx_bytes: 35_190_280,
          latency_ms: 18, packet_loss_pct: 0,
          path_type: 'direct', nat_type: 'Full Cone NAT' });
      }
    }
    setConnecting(false);
  }, [status.connected, peers]);

  const connectPeer = useCallback(async (peer: DesktopPeerInfo) => {
    setConnecting(true);
    if (window.go?.main?.App) setStatus(await window.go.main.App.ConnectPeer(peer.id));
    else {
      setStatus(p => ({ ...p, connected: true, state: 'connected',
        active_peer_id: peer.id, active_peer_name: peer.name,
        connected_since: new Date().toISOString() }));
      setTel(p => ({ ...p, download_rate_kbps: 1820, upload_rate_kbps: 410,
        latency_ms: peer.latency_ms, path_type: peer.direct_available ? 'direct' : 'relay' }));
    }
    setConnecting(false);
  }, []);

  /* ── Diagnostics ──────────────────────────────────────────── */
  const runDiag = useCallback(async () => {
    setDiagRunning(true);
    if (window.go?.main?.App) {
      setDiag(await window.go.main.App.RunDiagnostics());
    } else {
      await new Promise(r => setTimeout(r, 1100));
      setDiag({
        healthy: true,
        checks: [
          { name: 'WireGuard TUN Interface', passed: true, latency_ms: 1, message: 'zoop0 active — MTU 1420, RX/TX OK' },
          { name: 'Cloud Signaling Server',  passed: true, latency_ms: 14, message: 'Control plane reachable (localhost:8080)' },
          { name: 'STUN Discovery',          passed: true, latency_ms: 22, message: 'Public IP mapped: 198.51.100.12:51820' },
          { name: 'NAT Traversal',           passed: true, latency_ms: 22, message: 'Full Cone NAT — Direct P2P capable' },
          { name: 'Crypto Backend',          passed: true, latency_ms: 0,  message: 'Ed25519 key valid, ChaCha20-Poly1305 cipher ready' },
        ],
        details: [
          'Routing table 200: OK',
          'iptables MASQUERADE rule: Active',
          'DNS resolver: 1.1.1.1 — reachable (4ms)',
          'Peer exchange protocol: v2',
        ],
        diagnostic_time_rfc: new Date().toISOString(),
      });
    }
    setDiagRunning(false);
  }, []);

  /* ── Orb state ─────────────────────────────────────────────── */
  const orbState = connecting ? 'busy' : status.connected ? 'on' : 'off';

  const navItems: { id: NavPage; icon: string; label: string }[] = [
    { id: 'home',        icon: Icons.home,     label: 'Dashboard' },
    { id: 'peers',       icon: Icons.peers,    label: 'Peers' },
    { id: 'share',       icon: Icons.share,    label: 'Share' },
    { id: 'diagnostics', icon: Icons.diag,     label: 'Diagnostics' },
    { id: 'settings',    icon: Icons.settings, label: 'Settings' },
  ];

  const pageInfo: Record<NavPage, { title: string; sub: string }> = {
    home:        { title: 'Dashboard',          sub: 'Connection overview & live telemetry' },
    peers:       { title: 'Mesh Peers',          sub: `${peers.filter(p => p.online).length} nodes online` },
    share:       { title: 'Internet Sharing',    sub: 'Provider mode — share your connection' },
    diagnostics: { title: 'Diagnostics',         sub: 'System health probes & logs' },
    settings:    { title: 'Preferences',         sub: 'Client configuration & tunnel settings' },
  };

  /* ── Download bar width (0–100%) ───────────────────────────── */
  const dlPct = Math.min(100, (tel.download_rate_kbps / 10000) * 100);
  const ulPct = Math.min(100, (tel.upload_rate_kbps  / 3000)  * 100);

  return (
    <div className="shell">
      {/* ════ Titlebar ══════════════════════════════════════════ */}
      <header className="titlebar">
        <div className="titlebar-logo">
          <div className="orb" />
          <span>Zoop</span>
        </div>
        <div className="titlebar-status">
          <div className={`dot ${status.connected ? 'live' : ''}`} />
          <span>{status.connected ? `Protected · ${status.active_peer_name ?? 'Mesh'}` : 'Not Connected'}</span>
        </div>
        <div className="titlebar-right">
          <button className="btn btn-ghost" style={{ fontSize: 11 }}
            onClick={() => window.open?.('https://app.zoop.network', '_blank')}>
            Web Portal <Icon d={Icons.arrow} size={11} />
          </button>
        </div>
      </header>

      {/* ════ Body ══════════════════════════════════════════════ */}
      <div className="body">
        {/* ── Left Icon Nav ─────────────────────────────────── */}
        <nav className="sidenav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)} title={n.label}>
              <Icon d={n.icon} size={20} />
              <span className="tooltip">{n.label}</span>
            </button>
          ))}
          <div className="nav-spacer" />
          <button className="nav-item" title="Quit" onClick={() => window.close?.()}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" />
            </svg>
            <span className="tooltip">Quit</span>
          </button>
        </nav>

        {/* ── Main Content ──────────────────────────────────── */}
        <div className="main">
          {/* ── Center Column: Power Orb & Status ─────────── */}
          <div className="center-col">
            <div className="orb-zone">
              {/* Power Orb */}
              <div className={`orb-wrapper ${orbState}`} onClick={toggleTunnel}>
                <div className="orb-ring-outer" />
                <div className="orb-ring-mid" />
                <button className="orb-button" id="orb-btn" aria-label="Toggle connection">
                  <span className="orb-icon">
                    <Icon d={Icons.power} size={36} />
                  </span>
                </button>
              </div>

              {/* Status Labels */}
              <div className="orb-info">
                <div className={`status-label ${orbState === 'on' ? 'connected' : orbState === 'busy' ? 'connecting' : 'disconnected'}`}>
                  {connecting ? 'Connecting…' : status.connected ? 'Protected' : 'Not Connected'}
                </div>
                <div className="status-sublabel">
                  {status.connected
                    ? `via ${status.active_peer_name ?? 'Mesh'} · ${tel.path_type.toUpperCase()}`
                    : 'Click the button to connect'}
                </div>

                <div className="ip-display" style={{ marginTop: 8 }}>
                  <div className="ip-item">
                    <span className={`ip-val ${status.connected ? '' : 'muted'}`}>{status.assigned_ip}</span>
                    <span className="ip-key">Mesh IP</span>
                  </div>
                  <div style={{ width: 1, background: 'var(--b2)', alignSelf: 'stretch' }} />
                  <div className="ip-item">
                    <span className="ip-val muted">{status.public_ip}</span>
                    <span className="ip-key">Public</span>
                  </div>
                </div>

                <div className={`sec-badge ${status.connected ? 'protected' : 'unprotected'}`} style={{ marginTop: 12 }}>
                  <Icon d={Icons.shield} size={12} />
                  {status.connected ? 'WireGuard Encrypted' : 'Unencrypted — Exposed'}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="qstat">
                <div className="qstat-label">Download</div>
                <div className={`qstat-val ${status.connected ? 'cyan' : ''}`}>
                  {status.connected ? `${(tel.download_rate_kbps / 1024).toFixed(1)} MB/s` : '—'}
                </div>
              </div>
              <div className="qstat">
                <div className="qstat-label">Upload</div>
                <div className={`qstat-val ${status.connected ? 'green' : ''}`}>
                  {status.connected ? `${(tel.upload_rate_kbps / 1024).toFixed(1)} MB/s` : '—'}
                </div>
              </div>
              <div className="qstat">
                <div className="qstat-label">Latency</div>
                <div className="qstat-val">
                  {status.connected ? `${tel.latency_ms} ms` : '—'}
                </div>
              </div>
              <div className="qstat">
                <div className="qstat-label">Cipher</div>
                <div className="qstat-val" style={{ fontSize: 11 }}>ChaCha20</div>
              </div>
            </div>

            {/* Provider Mode Quick Toggle */}
            <div className="provider-row">
              <div>
                <div className="provider-row-label">Provider Mode</div>
                <div className="provider-row-sub">{providerOn ? 'Sharing your internet' : 'Not sharing'}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={providerOn} onChange={e => setProviderOn(e.target.checked)} />
                <div className="toggle-track" />
              </label>
            </div>
          </div>

          {/* ── Right Column: Page Content ─────────────────── */}
          <div className="right-col">
            <div className="page-header">
              <div>
                <div className="page-title">{pageInfo[page].title}</div>
                <div className="page-sub">{pageInfo[page].sub}</div>
              </div>
              {page === 'diagnostics' && (
                <button className="btn btn-secondary" onClick={runDiag} disabled={diagRunning}
                  style={{ gap: 8 }}>
                  {diagRunning ? <><span className="spinner" /> Running…</> : <><Icon d={Icons.zap} size={12} />Run Diagnostics</>}
                </button>
              )}
            </div>

            <div className="view">
              {/* ── HOME: Live Telemetry ─────────────────── */}
              {page === 'home' && (<>
                <div>
                  <div className="section-head"><span className="section-h">Traffic</span></div>
                  <div className="traffic-row">
                    <div className="traffic-card">
                      <div className="tc-head">
                        <span className="tc-label">⬇ Download</span>
                        <div>
                          <span className="tc-val" style={{ color: status.connected ? 'var(--cyan)' : 'var(--t3)' }}>
                            {status.connected ? (tel.download_rate_kbps / 1024).toFixed(1) : '0.0'}
                          </span>
                          <span className="tc-unit"> MB/s</span>
                        </div>
                      </div>
                      <div className="bar-track"><div className="bar-fill down" style={{ width: `${dlPct}%` }} /></div>
                      <div className="tc-sub">Total Rx: {fmtBytes(tel.total_rx_bytes)}</div>
                    </div>
                    <div className="traffic-card">
                      <div className="tc-head">
                        <span className="tc-label">⬆ Upload</span>
                        <div>
                          <span className="tc-val" style={{ color: status.connected ? 'var(--green)' : 'var(--t3)' }}>
                            {status.connected ? (tel.upload_rate_kbps / 1024).toFixed(1) : '0.0'}
                          </span>
                          <span className="tc-unit"> MB/s</span>
                        </div>
                      </div>
                      <div className="bar-track"><div className="bar-fill up" style={{ width: `${ulPct}%` }} /></div>
                      <div className="tc-sub">Total Tx: {fmtBytes(tel.total_tx_bytes)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-head"><span className="section-h">Connection Quality</span></div>
                  <div className="latency-row">
                    <div className="meter-card">
                      <div className="tc-label">Latency</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                          color: status.connected ? (tel.latency_ms < 50 ? 'var(--green)' : 'var(--amber)') : 'var(--t3)' }}>
                          {status.connected ? tel.latency_ms : '—'}
                        </span>
                        {status.connected && <span style={{ color: 'var(--t3)', fontSize: 12 }}>ms</span>}
                      </div>
                      <div className="tc-sub">{tel.nat_type}</div>
                    </div>
                    <div className="meter-card">
                      <div className="tc-label">Packet Loss</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                          color: status.connected ? 'var(--green)' : 'var(--t3)' }}>
                          {status.connected ? tel.packet_loss_pct.toFixed(1) : '—'}
                        </span>
                        {status.connected && <span style={{ color: 'var(--t3)', fontSize: 12 }}>%</span>}
                      </div>
                      <div className="tc-sub">Path: {tel.path_type.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="section-head">
                    <span className="section-h">Nearby Peers</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setPage('peers')}>
                      View all →
                    </button>
                  </div>
                  <div className="peer-list">
                    {peers.filter(p => p.online).slice(0, 3).map(p => (
                      <PeerCard key={p.id} peer={p} activePeerId={status.active_peer_id}
                        onConnect={connectPeer} onDisconnect={toggleTunnel} />
                    ))}
                  </div>
                </div>
              </>)}

              {/* ── PEERS ───────────────────────────────── */}
              {page === 'peers' && (
                <div>
                  <div className="peer-list">
                    {peers.map(p => (
                      <PeerCard key={p.id} peer={p} activePeerId={status.active_peer_id}
                        onConnect={connectPeer} onDisconnect={toggleTunnel} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── SHARE ───────────────────────────────── */}
              {page === 'share' && (<>
                <div className="share-hero">
                  <p className="share-description">
                    Turn this machine into a <strong>Provider node</strong> — authorized devices
                    in your mesh can securely route their internet traffic through your connection.
                    All traffic is end-to-end encrypted with WireGuard.
                  </p>

                  <div className="big-toggle-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Enable Provider Mode</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                        Share this machine's internet with authorized peers
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={providerOn} onChange={e => setProviderOn(e.target.checked)} />
                      <div className="toggle-track" />
                    </label>
                  </div>

                  {providerOn && (
                    <div className="share-stats-grid">
                      <div className="share-stat">
                        <div className="share-stat-label">Connected Devices</div>
                        <div className="share-stat-val">2</div>
                        <div className="share-stat-sub">MacBook Air, Pixel 8</div>
                      </div>
                      <div className="share-stat">
                        <div className="share-stat-label">Data Shared Today</div>
                        <div className="share-stat-val">1.42 GB</div>
                        <div className="share-stat-sub">No quota set</div>
                      </div>
                      <div className="share-stat">
                        <div className="share-stat-label">Uptime</div>
                        <div className="share-stat-val">3h 12m</div>
                        <div className="share-stat-sub">Since 01:21 AM</div>
                      </div>
                    </div>
                  )}
                </div>

                {providerOn && (<>
                  <div className="section-head"><span className="section-h">Connected Consumers</span></div>
                  <div className="consumer-list">
                    {[
                      { name: 'MacBook Air', meta: '100.64.0.3 · darwin · Direct P2P', rx: '892 MB' },
                      { name: 'Pixel 8 Pro', meta: '100.64.0.8 · android · Relay',     rx: '543 MB' },
                    ].map((c, i) => (
                      <div key={i} className="consumer-row">
                        <div>
                          <div className="consumer-name">{c.name}</div>
                          <div className="consumer-meta">{c.meta}</div>
                        </div>
                        <span className="consumer-rx">{c.rx}</span>
                      </div>
                    ))}
                  </div>
                </>)}
              </>)}

              {/* ── DIAGNOSTICS ─────────────────────────── */}
              {page === 'diagnostics' && (
                diag ? (<>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={`sec-badge ${diag.healthy ? 'protected' : 'unprotected'}`}>
                      <Icon d={diag.healthy ? Icons.check : Icons.alert} size={12} />
                      {diag.healthy ? 'All Systems Go' : 'Issues Detected'}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                      Tested {new Date(diag.diagnostic_time_rfc).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <div className="section-head"><span className="section-h">Health Checks</span></div>
                    <div className="diag-list">
                      {diag.checks.map((c, i) => (
                        <div key={i} className="diag-row">
                          <div>
                            <div className="diag-name">{c.name}</div>
                            <div className="diag-msg">{c.message}</div>
                          </div>
                          <span className={c.passed ? 'diag-ok' : 'diag-warn'}>
                            {c.passed ? '✓ PASS' : '⚠ FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="section-head"><span className="section-h">System Log</span></div>
                    <div className="diag-log">
                      {diag.details.map((d, i) => <div key={i}>{'> '}{d}</div>)}
                    </div>
                  </div>
                </>) : (
                  <div className="empty">
                    <div style={{ marginBottom: 8, color: 'var(--t3)' }}>
                      <Icon d={Icons.activity} size={28} />
                    </div>
                    Press <strong>Run Diagnostics</strong> to probe WireGuard, STUN routing, and cloud signaling.
                  </div>
                )
              )}

              {/* ── SETTINGS ────────────────────────────── */}
              {page === 'settings' && (
                <div className="settings-sections">
                  <div className="settings-group">
                    <div className="settings-group-title">Tunnel</div>
                    {[
                      { name: 'Auto-Connect on Startup', desc: 'Establish tunnel automatically when system boots',
                        ctrl: <label className="toggle-switch"><input type="checkbox" checked={settings.auto_connect}
                          onChange={e => setSettings(s => ({ ...s, auto_connect: e.target.checked }))} />
                          <div className="toggle-track" /></label> },
                      { name: 'Kill Switch', desc: 'Block all internet traffic if the tunnel connection drops',
                        ctrl: <label className="toggle-switch"><input type="checkbox" checked={settings.kill_switch}
                          onChange={e => setSettings(s => ({ ...s, kill_switch: e.target.checked }))} />
                          <div className="toggle-track" /></label> },
                      { name: 'Local LAN Access', desc: 'Allow access to printers and NAS devices on local network',
                        ctrl: <label className="toggle-switch"><input type="checkbox" checked={settings.allow_local_lan}
                          onChange={e => setSettings(s => ({ ...s, allow_local_lan: e.target.checked }))} />
                          <div className="toggle-track" /></label> },
                    ].map((r, i) => (
                      <div key={i} className="setting-row">
                        <div>
                          <div className="setting-name">{r.name}</div>
                          <div className="setting-desc">{r.desc}</div>
                        </div>
                        {r.ctrl}
                      </div>
                    ))}
                  </div>

                  <div className="settings-group">
                    <div className="settings-group-title">Device</div>
                    <div className="setting-row">
                      <div>
                        <div className="setting-name">Device Name</div>
                        <div className="setting-desc">Name shown to peers in the mesh</div>
                      </div>
                      <input className="setting-input" value={settings.device_name}
                        onChange={e => setSettings(s => ({ ...s, device_name: e.target.value }))} />
                    </div>
                    <div className="setting-row">
                      <div>
                        <div className="setting-name">Tunnel Interface</div>
                        <div className="setting-desc">WireGuard network adapter name</div>
                      </div>
                      <input className="setting-input" value={settings.tunnel_if_name}
                        onChange={e => setSettings(s => ({ ...s, tunnel_if_name: e.target.value }))} />
                    </div>
                  </div>

                  <div className="settings-group">
                    <div className="settings-group-title">DNS</div>
                    <div className="setting-row">
                      <div>
                        <div className="setting-name">Encrypted DNS Servers</div>
                        <div className="setting-desc">Comma-separated resolver IPs (e.g. 1.1.1.1, 1.0.0.1)</div>
                      </div>
                      <input className="setting-input" value={settings.dns_servers.join(', ')}
                        onChange={e => setSettings(s => ({ ...s, dns_servers: e.target.value.split(',').map(x => x.trim()) }))} />
                    </div>
                    <div className="setting-row">
                      <div>
                        <div className="setting-name">Control Plane URL</div>
                        <div className="setting-desc">Cloud signaling server address</div>
                      </div>
                      <input className="setting-input" value={settings.control_plane_url}
                        onChange={e => setSettings(s => ({ ...s, control_plane_url: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-primary" onClick={async () => {
                      if (window.go?.main?.App) await window.go.main.App.SaveSettings(settings);
                    }}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Peer Card
   ═══════════════════════════════════════════════════════════ */
const PeerCard: React.FC<{
  peer: DesktopPeerInfo;
  activePeerId?: string;
  onConnect: (p: DesktopPeerInfo) => void;
  onDisconnect: () => void;
}> = ({ peer, activePeerId, onConnect, onDisconnect }) => {
  const isActive = activePeerId === peer.id;
  const lc = latencyClass(peer.latency_ms);
  return (
    <div className={`peer-card ${isActive ? 'active' : ''} ${!peer.online ? 'offline' : ''}`}>
      <div className="peer-flag">{flag[peer.country] ?? '🌐'}</div>
      <div className="peer-info">
        <div className="peer-name">{peer.name}</div>
        <div className="peer-loc">{peer.city} · {peer.virtual_ip}</div>
      </div>
      <div className="peer-right">
        {peer.online ? (
          <span className={`latency-badge ${lc}`}>{peer.latency_ms} ms</span>
        ) : (
          <span className="latency-badge" style={{ color: 'var(--t3)' }}>Offline</span>
        )}
        <span className="path-tag">{peer.direct_available ? 'Direct P2P' : 'Relay'}</span>
      </div>
      <div style={{ flexShrink: 0 }}>
        {isActive ? (
          <button className="peer-connect-btn disconnect" onClick={onDisconnect}>Disconnect</button>
        ) : (
          <button className="peer-connect-btn" onClick={() => onConnect(peer)} disabled={!peer.online}>
            {peer.online ? 'Connect' : 'Offline'}
          </button>
        )}
      </div>
    </div>
  );
};
