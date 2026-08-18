import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';
import { useApp } from '../../context/NetworkContext';

/* ─── Icons ─────────────────────────────────────────────────── */
const Ico: React.FC<{ d: string | React.ReactNode; size?: number }> = ({ d, size = 15 }) => (
  typeof d === 'string'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d as string}/></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const I = {
  home:       <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  monitor:    <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  zap:        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  share:      <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  user:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  plus:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  logOut:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  chevronR:   <polyline points="9 18 15 12 9 6"/>,
  chevronD:   <polyline points="6 9 12 15 18 9"/>,
  check:      <polyline points="20 6 9 17 4 12"/>,
  copy:       <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  wifi:       <><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  wifiOff:    <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  alert:      <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  shield:     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
};

/* ─── Portal Switcher ─────────────────────────────────────────── */
const PORTAL_LABELS: Record<PortalMode, string> = {
  desktop: 'Zoop Desktop App',
  user:    'app.zoop.com',
  org:     'app.zoop.com/org',
  admin:   'admin.zoop.com',
};
const PORTAL_COLORS: Record<PortalMode, string> = {
  desktop: 'var(--accent-cyan)', user: 'var(--accent-green)', org: 'var(--accent-blue)', admin: 'var(--accent-amber)',
};

const PortalSwitcher: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="portal-switcher" ref={ref}>
      <button className="portal-switcher-trigger" id="portal-switch-trigger" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" style={{ background: PORTAL_COLORS[mode] }} />
        <span className="switcher-domain">{PORTAL_LABELS[mode]}</span>
        <Ico d={I.chevronD} size={12} />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['desktop', 'user', 'org', 'admin'] as PortalMode[]).map(m => (
            <button key={m} id={`switch-to-${m}`} className={`portal-switcher-option${mode === m ? ' ps-selected' : ''}`}
              onClick={() => { onSwitch(m); setOpen(false); }} role="option" aria-selected={mode === m}>
              {mode === m ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
              <span className="switcher-dot" style={{ background: PORTAL_COLORS[m] }} />
              {PORTAL_LABELS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


/* ─── Register device modal ───────────────────────────────────── */
const RegisterModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { register, isRegistering, registerError } = useApp();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('linux');
  const [isProvider, setIsProvider] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await register(name.trim(), platform, isProvider);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Register this device with Zoop</span>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        {registerError && <div className="error-banner"><Ico d={I.alert} />Registration failed: {registerError}</div>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Device Name</label>
            <input id="reg-name" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. My Laptop" required autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Platform</label>
              <select id="reg-platform" value={platform} onChange={e => setPlatform(e.target.value)}>
                <option value="linux">Linux</option>
                <option value="darwin">macOS</option>
                <option value="windows">Windows</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </div>
            <div className="field" style={{ justifyContent: 'flex-end', paddingBottom: 6 }}>
              <label style={{ marginBottom: 'auto' }}>Act as Provider</label>
              <label className="toggle" aria-label="Enable provider mode">
                <input type="checkbox" id="reg-provider" checked={isProvider} onChange={e => setIsProvider(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" id="reg-submit" disabled={isRegistering}>
              {isRegistering ? <><span className="spinner" style={{ width: 13, height: 13 }} />Registering…</> : <><Ico d={I.plus} />Register Device</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Tab types ───────────────────────────────────────────────── */
type UserTab = 'overview' | 'devices' | 'connections' | 'sharing' | 'settings';

const NAV: { id: UserTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',     icon: <Ico d={I.home}     /> },
  { id: 'devices',      label: 'Devices',      icon: <Ico d={I.monitor}  /> },
  { id: 'connections',  label: 'Connections',  icon: <Ico d={I.zap}      /> },
  { id: 'sharing',      label: 'Sharing',      icon: <Ico d={I.share}    /> },
  { id: 'settings',     label: 'Settings',     icon: <Ico d={I.settings} /> },
];

/* ─── Overview tab ────────────────────────────────────────────── */
const OverviewTab: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const { deviceId, deviceName, deviceInfo, connections, connectionsLoading } = useApp();
  const pending = connections.filter(c => c.state === 'REQUESTED');

  if (!deviceId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Ico d={I.wifi} size={22} /></div>
        <h3>Not registered</h3>
        <p>Register this device with the Zoop Control Plane to get started.</p>
        <button className="btn btn-primary btn-sm" id="overview-register-btn" onClick={onRegister} style={{ marginTop: 8 }}>
          <Ico d={I.plus} />Register Device
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="section">
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-dot online" />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{deviceName}</span>
              <span className="badge badge-info">Registered</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              Device ID: {deviceId}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Platform: {deviceInfo?.platform ?? '—'}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Pending Connections</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {connectionsLoading ? 'Loading…' : `${pending.length} pending`}
          </span>
        </div>
        {pending.length === 0 && !connectionsLoading ? (
          <div className="empty-state" style={{ padding: '36px 24px' }}>
            <div className="empty-icon"><Ico d={I.zap} size={20} /></div>
            <h3>No pending connections</h3>
            <p>Pending connection requests from providers will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Connection</th><th>Provider</th><th>Recipient</th><th>State</th></tr></thead>
            <tbody>
              {pending.map(c => (
                <tr key={c.id.toString()}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.id.toString().slice(0, 8)}…</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.provider_id.toString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.recipient_id.toString()}</td>
                  <td><span className="badge badge-warning">{c.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

/* ─── Devices tab ─────────────────────────────────────────────── */
const DevicesTab: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const { deviceId, deviceName, deviceInfo, allDevices, devicesLoading, refreshAllDevices } = useApp();

  return (
    <>
      {deviceId && (
        <div className="section" style={{ marginBottom: 16 }}>
          <div className="section-header"><span className="section-title">This Device Session</span></div>
          <div className="info-row">
            <span className="info-key">Device Name</span>
            <span className="info-val">{deviceName}</span>
            <span />
          </div>
          <div className="info-row">
            <span className="info-key">Device ID</span>
            <span className="info-val" style={{ fontSize: '0.75rem' }}>{deviceId}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(deviceId)}>
              <Ico d={I.copy} size={12} />Copy
            </button>
          </div>
          <div className="info-row">
            <span className="info-key">Platform</span>
            <span className="info-val">{deviceInfo?.platform ?? '—'}</span>
            <span />
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">Registered Fleet Devices ({allDevices.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-xs" onClick={refreshAllDevices}>
              {devicesLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
            </button>
            <button className="btn btn-primary btn-xs" onClick={onRegister}>
              <Ico d={I.plus} />Register New
            </button>
          </div>
        </div>
        {allDevices.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 24px' }}>
            <div className="empty-icon"><Ico d={I.monitor} size={22} /></div>
            <h3>No devices in system</h3>
            <p>Register a device to add it to the Control Plane registry.</p>
            <button className="btn btn-primary btn-sm" onClick={onRegister} style={{ marginTop: 8 }}>
              <Ico d={I.plus} />Register Device
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Device ID</th>
                <th>OS / Platform</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allDevices.map(d => (
                <tr key={d.id.toString()}>
                  <td style={{ fontWeight: 600 }}>
                    {d.name || 'Unnamed Device'}
                    {d.id.toString() === deviceId && <span className="badge badge-info" style={{ marginLeft: 6 }}>Current</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{d.id.toString()}</td>
                  <td>{d.os || d.platform || '—'}</td>
                  <td><span className={`badge ${d.status === 'trusted' || d.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

/* ─── Connections tab ─────────────────────────────────────────── */
const stateBadge = (s: string) => {
  switch (s) {
    case 'CONNECTED':    return <span className="badge badge-success">{s}</span>;
    case 'REQUESTED':    return <span className="badge badge-warning">{s}</span>;
    case 'AUTHORIZED':
    case 'CONNECTING':   return <span className="badge badge-info">{s}</span>;
    default:             return <span className="badge badge-neutral">{s}</span>;
  }
};

const ConnectionsTab: React.FC = () => {
  const { deviceId, connections, connectionsLoading, doConnect, doDisconnect, refreshConnections } = useApp();
  const [providerId, setProviderId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [busyConn, setBusyConn] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await doConnect(providerId.trim());
      setProviderId('');
      refreshConnections();
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Ico d={I.zap} size={22} /></div>
        <h3>Not registered</h3>
        <p>Register this device first to manage connections.</p>
      </div>
    );
  }

  const pending = connections.filter(c => c.state === 'REQUESTED');
  const active = connections.filter(c => c.state !== 'REQUESTED' && c.state !== 'DISCONNECTED');

  return (
    <>
      {connectError && <div className="error-banner"><Ico d={I.alert} />{connectError}</div>}

      <div className="section">
        <div className="section-header"><span className="section-title">Initiate Connection</span></div>
        <form onSubmit={handleConnect} style={{ padding: '16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Provider Device ID</label>
            <input id="conn-provider-id" type="text" value={providerId} onChange={e => setProviderId(e.target.value)}
              placeholder="Provider's Device ID" required />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" id="connect-btn" disabled={connecting}>
            {connecting ? <><span className="spinner" style={{ width: 13, height: 13 }} />Connecting…</> : <><Ico d={I.zap} />Connect</>}
          </button>
        </form>
        <div style={{ padding: '0 16px 14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Paste the Provider's Device ID (from their Settings screen) to request a connection.
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Active Connections ({active.length})</span>
          <button className="btn btn-ghost btn-xs" id="refresh-connections-btn" onClick={refreshConnections}>
            {connectionsLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {active.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 24px' }}>
            <div className="empty-icon"><Ico d={I.zap} size={20} /></div>
            <h3>No active connections</h3>
            <p>Initiate a connection above to start sharing through a provider.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Peer</th><th>State</th><th>IPs</th><th /></tr></thead>
            <tbody>
              {active.map(c => {
                const isProvider = c.provider_id.toString() === deviceId;
                return (
                  <tr key={c.id.toString()}>
                    <td>
                      {isProvider
                        ? <span className="badge badge-info">Providing</span>
                        : <span className="badge badge-neutral">Receiving</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {isProvider ? c.recipient_id.toString() : c.provider_id.toString()}
                    </td>
                    <td>{stateBadge(c.state)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {isProvider ? c.recipient_ip ?? '—' : c.provider_ip ?? '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-danger btn-xs" disabled={busyConn === c.id.toString()}
                        onClick={() => {
                          setBusyConn(c.id.toString());
                          doDisconnect(c.id.toString()).finally(() => setBusyConn(null));
                        }}>
                        <Ico d={I.wifiOff} />Disconnect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Pending Requests ({pending.length})</span>
        </div>
        {pending.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 24px' }}>
            <div className="empty-icon"><Ico d={I.zap} size={20} /></div>
            <h3>No pending requests</h3>
            <p>When a provider initiates a connection to this device it will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Peer</th><th>State</th><th /></tr></thead>
            <tbody>
              {pending.map(c => {
                const isProvider = c.provider_id.toString() === deviceId;
                return (
                  <tr key={c.id.toString()}>
                    <td>
                      {isProvider
                        ? <span className="badge badge-info">Providing</span>
                        : <span className="badge badge-warning">Incoming</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {isProvider ? c.recipient_id.toString() : c.provider_id.toString()}
                    </td>
                    <td>{stateBadge(c.state)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!isProvider && (
                        <button className="btn btn-danger btn-xs" onClick={() => doDisconnect(c.id.toString())}>Decline</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

/* ─── Sharing tab ─────────────────────────────────────────────── */
const SharingTab: React.FC = () => {
  const { deviceId, shares, doCreateShare } = useApp();
  const [recipientId, setRecipientId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId.trim()) return;
    setSharing(true);
    setShareError(null);
    try {
      await doCreateShare(recipientId.trim());
      setRecipientId('');
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Failed to create share');
    } finally {
      setSharing(false);
    }
  };

  if (!deviceId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Ico d={I.share} size={22} /></div>
        <h3>Not registered</h3>
        <p>Register this device to manage sharing relationships.</p>
      </div>
    );
  }

  return (
    <>
      {shareError && <div className="error-banner"><Ico d={I.alert} />{shareError}</div>}

      <div className="section">
        <div className="section-header"><span className="section-title">Authorize Recipient</span></div>
        <form onSubmit={handleShare} style={{ padding: '16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Recipient Device ID</label>
            <input id="share-recipient-id" type="text" value={recipientId} onChange={e => setRecipientId(e.target.value)}
              placeholder="Recipient's Device UUID" required />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" id="share-create-btn" disabled={sharing}>
            {sharing ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
            Authorize
          </button>
        </form>
      </div>

      <div className="section">
        <div className="section-header"><span className="section-title">Active Shares ({shares.length})</span></div>
        {shares.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 24px' }}>
            <div className="empty-icon"><Ico d={I.share} size={20} /></div>
            <h3>No sharing relationships</h3>
            <p>Authorize a recipient above to allow them to connect through this device.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Peer</th><th>Status</th></tr></thead>
            <tbody>
              {shares.map(s => {
                const isProvider = s.provider_id.toString() === deviceId;
                return (
                  <tr key={s.id.toString()}>
                    <td>
                      {isProvider
                        ? <span className="badge badge-info">Provider</span>
                        : <span className="badge badge-neutral">Recipient</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {isProvider ? s.recipient_id.toString() : s.provider_id.toString()}
                    </td>
                    <td>
                      {s.is_active
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-neutral">Inactive</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

/* ─── Settings tab ────────────────────────────────────────────── */
const SettingsTab: React.FC = () => {
  const { deviceId, deviceName, deviceInfo, unregister } = useApp();

  return (
    <div className="section settings-section">
      <div className="settings-section-header">
        <h3>Device Identity</h3>
        <p>Cryptographic device identity registered with the Zoop Control Plane.</p>
      </div>
      <div className="info-row">
        <span className="info-key">Device Name</span>
        <span className="info-val">{deviceName ?? '—'}</span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">Device ID</span>
        <span className="info-val" style={{ fontSize: '0.75rem' }}>{deviceId ?? '—'}</span>
        {deviceId && (
          <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(deviceId)}>
            <Ico d={I.copy} size={12} />Copy
          </button>
        )}
      </div>
      {deviceInfo?.assigned_ip && (
        <div className="info-row">
          <span className="info-key">Assigned IP</span>
          <span className="info-val">{deviceInfo.assigned_ip}</span>
          <span />
        </div>
      )}
      {deviceId && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-ghost btn-sm" id="settings-unregister-btn" onClick={unregister}
            style={{ color: 'var(--accent-red)' }}>
            <Ico d={I.logOut} />Unregister Device
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main UserDashboard ──────────────────────────────────────── */
export const UserDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const { deviceId, deviceName } = useApp();
  const [tab, setTab] = useState<UserTab>('overview');
  const [showRegister, setShowRegister] = useState(false);

  const TAB_META: Record<UserTab, { title: string; subtitle: string }> = {
    overview:    { title: 'Overview',    subtitle: 'Device status and pending connection requests.' },
    devices:     { title: 'Devices',     subtitle: 'This device\'s identity and registration details.' },
    connections: { title: 'Connections', subtitle: 'Initiate and manage WireGuard tunnel sessions.' },
    sharing:     { title: 'Sharing',     subtitle: 'Authorize recipients to use this device as a Provider.' },
    settings:    { title: 'Settings',    subtitle: 'Device identity and unregistration.' },
  };

  return (
    <div className="portal" role="main">
      <aside className="sidebar" aria-label="Navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={28} height={28} />
          </div>
          <div>
            <div className="sidebar-brand-name">Zoop</div>
            <div className="sidebar-brand-tagline">Direct Connectivity</div>
          </div>
        </div>

        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="User navigation">
          {NAV.map(item => (
            <button key={item.id} id={`nav-${item.id}`}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" id="user-profile-area">
            <div className="sidebar-avatar"><Ico d={I.user} size={14} /></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{deviceName ?? 'Not registered'}</div>
              <div className="sidebar-user-role">{deviceId ? 'Personal Device' : 'Tap to register'}</div>
            </div>
            <Ico d={I.chevronR} size={12} />
          </div>
        </div>
      </aside>

      <div className="portal-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">{TAB_META[tab].title}</h1>
            <p className="page-subtitle">{TAB_META[tab].subtitle}</p>
          </div>
          <div className="page-header-actions">
            {!deviceId && (
              <button className="btn btn-primary btn-sm" id="header-register-btn" onClick={() => setShowRegister(true)}>
                <Ico d={I.plus} />Register Device
              </button>
            )}
          </div>
        </header>

        <div className="page-body">
          {tab === 'overview'     && <OverviewTab onRegister={() => setShowRegister(true)} />}
          {tab === 'devices'      && <DevicesTab  onRegister={() => setShowRegister(true)} />}
          {tab === 'connections'  && <ConnectionsTab />}
          {tab === 'sharing'      && <SharingTab />}
          {tab === 'settings'     && <SettingsTab />}
        </div>
      </div>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
    </div>
  );
};

export default UserDashboard;
