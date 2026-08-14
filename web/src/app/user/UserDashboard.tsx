import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode, DevicePlatform, DeviceType } from '../../types';
import { useNetwork } from '../../context/NetworkContext';
import './UserDashboard.css';

/* ─── Icon Primitives ─────────────────────────────────────────────── */
const Ico: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const I = {
  home:     () => <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>,
  monitor:  () => <Ico><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Ico>,
  zap:      () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>,
  share:    () => <Ico><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Ico>,
  users:    () => <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  settings: () => <Ico><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>,
  wifiOff:  () => <Ico><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></Ico>,
  wifi:     () => <Ico><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></Ico>,
  plus:     () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  user:     () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  logOut:   () => <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico>,
  chevronR: () => <Ico size={13}><polyline points="9 18 15 12 9 6"/></Ico>,
  chevronD: () => <Ico size={13}><polyline points="6 9 12 15 18 9"/></Ico>,
  check:    () => <Ico size={14}><polyline points="20 6 9 17 4 12"/></Ico>,
  shield:   () => <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ico>,
  copy:     () => <Ico size={12}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ico>,
  radio:    () => <Ico><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></Ico>,
};

/* ─── Portal Switcher ─────────────────────────────────────────────── */
const DOMAINS: Record<PortalMode, string> = {
  user: 'app.zoop.com (Personal)',
  org: 'app.zoop.com/org (Acme Corp)',
  admin: 'admin.zoop.com (Operations)',
};

const PortalSwitcher: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="portal-switcher" ref={ref}>
      <button className="portal-switcher-trigger" onClick={() => setOpen(v => !v)}
              id="dev-switcher-trigger-user" aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" />
        <span className="switcher-domain">{DOMAINS[mode]}</span>
        <I.chevronD />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['user', 'org', 'admin'] as PortalMode[]).map(m => (
            <button key={m} id={`dev-switch-to-${m}`}
              className={`portal-switcher-option${mode === m ? ' ps-selected' : ''}`}
              onClick={() => { onSwitch(m); setOpen(false); }}
              role="option" aria-selected={mode === m}>
              {mode === m ? <I.check /> : <span className="ps-blank" />}
              {DOMAINS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

type UserTab = 'overview' | 'devices' | 'connections' | 'sharing' | 'settings';

export const UserDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const {
    devices,
    activeSession,
    shares,
    isConnecting,
    connectionStepLog,
    connectToProvider,
    disconnectTunnel,
    registerDevice,
    toggleProviderMode,
    addSharePolicy,
    revokeSharePolicy,
  } = useNetwork();

  const [tab, setTab] = useState<UserTab>('overview');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // New Device Form State
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>('laptop');
  const [newDevicePlatform, setNewDevicePlatform] = useState<DevicePlatform>('linux');
  const [newDeviceIsProvider, setNewDeviceIsProvider] = useState(false);

  // New Share Form State
  const [shareRecipientName, setShareRecipientName] = useState('');
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareBandwidth, setShareBandwidth] = useState<number>(50);

  const availableProviders = devices.filter(d => d.isProvider && d.providerEnabled);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName) return;
    await registerDevice({
      name: newDeviceName,
      type: newDeviceType,
      platform: newDevicePlatform,
      isProvider: newDeviceIsProvider,
      providerEnabled: newDeviceIsProvider,
    });
    setShowRegisterModal(false);
    setNewDeviceName('');
  };

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareRecipientName || !shareRecipientEmail) return;
    const providerDev = devices.find(d => d.isProvider) || devices[0];
    addSharePolicy(providerDev.id, shareRecipientName, shareRecipientEmail, shareBandwidth);
    setShowShareModal(false);
    setShareRecipientName('');
    setShareRecipientEmail('');
  };

  return (
    <div className="user-portal" role="main">
      <aside className="user-sidebar" aria-label="User navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={32} height={32} />
          </div>
          <div>
            <div className="sidebar-brand-name">Zoop Mesh</div>
            <div className="sidebar-brand-tagline">Direct Peer-to-Peer</div>
          </div>
        </div>

        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="Navigation">
          <button className={`nav-item${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>
            <I.home /><span className="nav-item-label">Overview & Telemetry</span>
          </button>
          <button className={`nav-item${tab === 'devices' ? ' active' : ''}`} onClick={() => setTab('devices')}>
            <I.monitor /><span className="nav-item-label">Device Fleet ({devices.length})</span>
          </button>
          <button className={`nav-item${tab === 'connections' ? ' active' : ''}`} onClick={() => setTab('connections')}>
            <I.zap /><span className="nav-item-label">Active Tunnels</span>
          </button>
          <button className={`nav-item${tab === 'sharing' ? ' active' : ''}`} onClick={() => setTab('sharing')}>
            <I.share /><span className="nav-item-label">Provider Sharing</span>
          </button>
          <button className={`nav-item${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>
            <I.settings /><span className="nav-item-label">Identity & Security</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" id="user-profile-btn" role="button" tabIndex={0}>
            <div className="sidebar-avatar"><I.user /></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Personal Account</div>
              <div className="sidebar-user-role">100.64.0.12 • Online</div>
            </div>
            <I.chevronR />
          </div>
        </div>
      </aside>

      <div className="user-content">
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">
              {tab === 'overview' && 'Network Overview & Live Tunnel'}
              {tab === 'devices' && 'Registered Zoop Endpoints'}
              {tab === 'connections' && 'Encrypted WireGuard Tunnels'}
              {tab === 'sharing' && 'Provider Mode & Sharing Matrix'}
              {tab === 'settings' && 'Identity & Cryptographic Keys'}
            </h1>
            <p className="page-subtitle">
              {tab === 'overview' && 'Real-time telemetry, peer discovery, and Direct WireGuard Data Plane status.'}
              {tab === 'devices' && 'Manage your authenticated endpoints, WireGuard public keys, and CGNAT IPs.'}
              {tab === 'connections' && 'Inspect real-time latency, bandwidth throughput, and NAT hole punching state.'}
              {tab === 'sharing' && 'Share your upstream internet connection with authorized family, peers, and devices.'}
              {tab === 'settings' && 'Ed25519 identity keypairs, WireGuard tunnel configuration, and audit logs.'}
            </p>
          </div>
          <div className="page-header-actions">
            {tab === 'overview' && !activeSession && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowConnectModal(true)}>
                <I.zap />Connect to Provider
              </button>
            )}
            {tab === 'overview' && activeSession && (
              <button className="btn btn-danger btn-sm" onClick={disconnectTunnel}>
                <I.wifiOff />Disconnect Tunnel
              </button>
            )}
            {tab === 'devices' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowRegisterModal(true)}>
                <I.plus />Register Endpoint
              </button>
            )}
            {tab === 'sharing' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowShareModal(true)}>
                <I.plus />Authorize Recipient
              </button>
            )}
          </div>
        </header>

        <div className="page-body">
          {tab === 'overview' && (
            <>
              {/* Telemetry Visualizer Card */}
              <div className={`telemetry-card ${activeSession ? 'connected' : ''}`}>
                <div className="telemetry-top">
                  <div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Data Plane Status
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {activeSession ? (
                        <>
                          <span className="telemetry-badge direct"><span className="pulse-dot" /> Connected (Direct P2P)</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            via {activeSession.providerName}
                          </span>
                        </>
                      ) : (
                        <span className="telemetry-badge offline"><span className="status-dot offline" /> Standby (No active tunnel)</span>
                      )}
                    </div>
                  </div>
                  {activeSession && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cipher Suite</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent-cyan)' }}>
                        {activeSession.telemetry.cipherSuite}
                      </div>
                    </div>
                  )}
                </div>

                {/* Path Visualizer */}
                <div className="path-visualizer">
                  <div className="node-box">
                    <div className="node-box-icon"><I.monitor /></div>
                    <div className="node-box-name">MacBook Pro (Recipient)</div>
                    <div className="node-box-ip">100.64.0.12</div>
                  </div>

                  <div className="path-line">
                    <span className="path-stats-pill">
                      {activeSession ? `${activeSession.telemetry.latencyMs} ms • 0% loss` : 'Path Idle'}
                    </span>
                    <div className={`path-track ${activeSession ? 'active' : ''}`} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {activeSession ? 'Encrypted WireGuard UDP Hole' : 'Ready for peer handshake'}
                    </span>
                  </div>

                  <div className="node-box">
                    <div className="node-box-icon"><I.radio /></div>
                    <div className="node-box-name">{activeSession ? activeSession.providerName : 'Provider Gateway'}</div>
                    <div className="node-box-ip">{activeSession ? activeSession.providerIP : '100.64.0.1'}</div>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div className="metrics-bar" style={{ marginTop: 8 }}>
                  <div className="metric-item">
                    <div className="metric-label">Roundtrip Latency</div>
                    <div className="metric-value" style={{ color: activeSession ? 'var(--accent-green)' : 'inherit' }}>
                      {activeSession ? `${activeSession.telemetry.latencyMs} ms` : '—'}
                    </div>
                    <div className="metric-sub">{activeSession ? `± ${activeSession.telemetry.jitterMs}ms jitter` : 'No active ping'}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Downstream (In)</div>
                    <div className="metric-value">
                      {activeSession ? `${(activeSession.telemetry.bandwidthInBps / 1000000).toFixed(1)} Mbps` : '—'}
                    </div>
                    <div className="metric-sub">{activeSession ? `${(activeSession.telemetry.bytesIn / (1024 * 1024)).toFixed(1)} MB transferred` : '0 MB'}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Upstream (Out)</div>
                    <div className="metric-value">
                      {activeSession ? `${(activeSession.telemetry.bandwidthOutBps / 1000000).toFixed(1)} Mbps` : '—'}
                    </div>
                    <div className="metric-sub">{activeSession ? `${(activeSession.telemetry.bytesOut / (1024 * 1024)).toFixed(1)} MB transferred` : '0 MB'}</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">NAT Firewall Type</div>
                    <div className="metric-value" style={{ fontSize: '1rem' }}>
                      {activeSession ? activeSession.telemetry.natType : 'Full Cone'}
                    </div>
                    <div className="metric-sub">STUN Traversal Ready</div>
                  </div>
                </div>
              </div>

              {/* Available Providers Section */}
              <div className="section" style={{ marginTop: 20 }}>
                <div className="section-header">
                  <span className="section-title">Authorized Providers Available ({availableProviders.length})</span>
                </div>
                <div className="device-grid">
                  {availableProviders.map(p => (
                    <div key={p.id} className="device-card">
                      <div className="device-card-header">
                        <div className="device-title-wrap">
                          <div className="device-icon"><I.radio /></div>
                          <div>
                            <div className="device-name">{p.name}</div>
                            <div className="device-ip">{p.assignedIP} • {p.platform}</div>
                          </div>
                        </div>
                        <span className="badge badge-success">Provider Ready</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Public IP: {p.publicIP}</span>
                        {!activeSession && (
                          <button className="btn btn-secondary btn-sm" onClick={() => connectToProvider(p)}>
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'devices' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Authenticated Endpoints ({devices.length})</span>
              </div>
              <div className="device-grid">
                {devices.map(d => (
                  <div key={d.id} className="device-card">
                    <div className="device-card-header">
                      <div className="device-title-wrap">
                        <div className="device-icon"><I.monitor /></div>
                        <div>
                          <div className="device-name">{d.name}</div>
                          <div className="device-ip">{d.assignedIP} • {d.platform}</div>
                        </div>
                      </div>
                      <span className={`badge ${d.status === 'online' ? 'badge-success' : 'badge-neutral'}`}>
                        {d.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>WireGuard Public Key</span>
                      <div className="device-key-box" onClick={() => navigator.clipboard.writeText(d.wireguardPublicKey)}>
                        <span>{d.wireguardPublicKey.slice(0, 24)}...</span>
                        <I.copy />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {d.isProvider ? 'Provider' : 'Recipient'}</span>
                      {d.isProvider && (
                        <label className="toggle" style={{ transform: 'scale(0.85)' }}>
                          <input type="checkbox" checked={d.providerEnabled} onChange={e => toggleProviderMode(d.id, e.target.checked)} />
                          <span className="toggle-slider" />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'connections' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Active Tunnel Sessions</span>
              </div>
              {activeSession ? (
                <div className="org-card" style={{ borderLeft: '3px solid var(--accent-green)' }}>
                  <div className="org-card-header">
                    <div>
                      <div className="org-card-title">{activeSession.tunnelInterface} ↔ {activeSession.providerName}</div>
                      <div className="org-card-meta">
                        Established {new Date(activeSession.establishedAt).toLocaleTimeString()} • Duration: {activeSession.durationSeconds}s
                      </div>
                    </div>
                    <span className="badge badge-success">Direct P2P Active</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local IP</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{activeSession.recipientIP}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider IP</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{activeSession.providerIP}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allowed IPs</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{activeSession.allowedIPs.join(', ')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DNS Servers</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{activeSession.dnsServers.join(', ')}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger btn-sm" onClick={disconnectTunnel}>Terminate Tunnel</button>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '52px 24px' }}>
                  <div className="empty-state-icon"><I.zap /></div>
                  <h3>No Active Tunnels</h3>
                  <p>Establish a secure WireGuard session with an authorized provider to inspect live packet counters.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowConnectModal(true)}>
                    Browse Providers
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'sharing' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Sharing Policies ({shares.length})</span>
              </div>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Identifier</th>
                    <th>Max Speed</th>
                    <th>Data Used Today</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.recipientName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.recipientIdentifier}</td>
                      <td>{s.maxBandwidthMbps} Mbps</td>
                      <td>{(s.usedTodayBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</td>
                      <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{s.status}</span></td>
                      <td>
                        {s.status === 'active' && (
                          <button className="btn btn-danger btn-xs" onClick={() => revokeSharePolicy(s.id)}>Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'settings' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h3>Ed25519 Identity & WireGuard Keys</h3>
                <p>Private cryptographic secrets remain exclusively stored on your local endpoints.</p>
              </div>
              <div className="info-row">
                <span className="info-key">Device Identity Public Key</span>
                <span className="info-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  aBcD1234eFgH5678iJkL9012mNoP3456qRsT7890uVw=
                </span>
                <button className="btn btn-ghost btn-xs" onClick={() => alert('Key copied to clipboard!')}>Copy</button>
              </div>
              <div className="info-row">
                <span className="info-key">CGNAT Virtual Address</span>
                <span className="info-val" style={{ fontFamily: 'var(--font-mono)' }}>100.64.0.12 / 10</span>
                <span className="badge badge-neutral">Assigned</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connect Modal with Live Handshake Log */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Select Provider to Connect</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowConnectModal(false)}>✕</button>
            </div>

            {isConnecting ? (
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Establishing Direct P2P Handshake:</span>
                <div className="terminal-log" style={{ marginTop: 8 }}>
                  {connectionStepLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableProviders.map(p => (
                  <div key={p.id} className="org-card" style={{ cursor: 'pointer' }} onClick={() => connectToProvider(p).then(() => setShowConnectModal(false))}>
                    <div className="org-card-header">
                      <div className="org-card-title">{p.name}</div>
                      <span className="badge badge-success">Online</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      IP: {p.assignedIP} • Public WAN: {p.publicIP}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register Endpoint Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Register New Zoop Endpoint</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Endpoint Name</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  placeholder="e.g. Linux Lab Workstation"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Device Type</label>
                  <select
                    value={newDeviceType}
                    onChange={e => setNewDeviceType(e.target.value as DeviceType)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                  >
                    <option value="laptop">Laptop</option>
                    <option value="desktop">Desktop</option>
                    <option value="server">Server</option>
                    <option value="router">Router Gateway</option>
                    <option value="phone">Smartphone</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Platform</label>
                  <select
                    value={newDevicePlatform}
                    onChange={e => setNewDevicePlatform(e.target.value as DevicePlatform)}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                  >
                    <option value="linux">Linux</option>
                    <option value="darwin">macOS</option>
                    <option value="windows">Windows</option>
                    <option value="openwrt">OpenWrt</option>
                    <option value="android">Android</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" id="provider-cb" checked={newDeviceIsProvider} onChange={e => setNewDeviceIsProvider(e.target.checked)} />
                <label htmlFor="provider-cb" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Enable as Provider (Share WAN)</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Generate Keys & Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Authorize New Recipient</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <form onSubmit={handleShareSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Recipient Name</label>
                <input
                  type="text"
                  value={shareRecipientName}
                  onChange={e => setShareRecipientName(e.target.value)}
                  placeholder="e.g. Carol Danvers"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Recipient Zoop ID / Email</label>
                <input
                  type="email"
                  value={shareRecipientEmail}
                  onChange={e => setShareRecipientEmail(e.target.value)}
                  placeholder="carol@zoop.network"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Max Bandwidth Limit (Mbps)</label>
                <input
                  type="number"
                  value={shareBandwidth}
                  onChange={e => setShareBandwidth(Number(e.target.value))}
                  min={5}
                  max={1000}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShareModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Grant Authorization</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
