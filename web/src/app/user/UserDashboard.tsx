import React, { useState, useMemo } from 'react';
import type { PortalMode } from '../../types';
import { useApp } from '../../context/NetworkContext';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';

/* ─── Icon helpers ───────────────────────────────────────────── */
const Ico: React.FC<{ d: string | React.ReactNode; size?: number }> = ({ d, size = 15 }) =>
  typeof d === 'string'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d as string}/></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;

const I = {
  home:      <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  monitor:   <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
  zap:       <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  link:      <><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  linkNodes: <><circle cx="12" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="9.2" y1="10.3" x2="14.8" y2="6.7"/><line x1="9.2" y1="13.7" x2="14.8" y2="17.3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></>,
  share:     <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  logOut:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  chevronR:  <polyline points="9 18 15 12 9 6"/>,
  check:     <polyline points="20 6 9 17 4 12"/>,
  menu:      <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  close:     <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  wifi:      <><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  wifiOff:   <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
};

/* ─── Tab types ───────────────────────────────────────────────── */
type UserTab = 'overview' | 'devices' | 'connections' | 'sharing' | 'settings';

const NAV: { id: UserTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',    icon: <Ico d={I.home}    /> },
  { id: 'devices',     label: 'Devices',     icon: <Ico d={I.monitor} /> },
  { id: 'connections', label: 'Connections', icon: <Ico d={I.link}    /> },
  { id: 'sharing',     label: 'Sharing',     icon: <Ico d={I.share}   /> },
  { id: 'settings',    label: 'Settings',    icon: <Ico d={I.settings}/> },
];

/* ─── Toast ───────────────────────────────────────────────────── */
interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string; }

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
          <button className="btn btn-ghost btn-xs" style={{ padding: '2px 4px', flexShrink: 0 }} onClick={() => onDismiss(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
};

/* ─── Daemon status card ──────────────────────────────────────── */

/* ─── Daemon status card ──────────────────────────────────────── */
const DaemonStatusCard: React.FC<{ onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ onToast }) => {
  const { localMode, daemonChecking, daemonStatus, daemonTelemetry, daemonPeers, refreshDaemon } = useApp();

  const activeTunnels = daemonTelemetry.filter(t => t.state === 'CONNECTED' || t.state === 'connected').length;
  const totalRx = daemonTelemetry.reduce((acc, t) => acc + (t.rx_bytes ?? 0), 0);
  const totalTx = daemonTelemetry.reduce((acc, t) => acc + (t.tx_bytes ?? 0), 0);
  const fmt = (n: number) => {
    if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MiB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KiB`;
    return `${n} B`;
  };

  if (daemonChecking && !localMode) {
    return (
      <div className="section">
        <div className="section-header"><span className="section-title">Local daemon (zoopd)</span></div>
        <div className="inline-empty">
          <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
          Checking for daemon on 127.0.0.1:9090…
        </div>
      </div>
    );
  }

  if (!localMode || !daemonStatus) {
    return (
      <div className="section">
        <div className="section-header">
          <span className="section-title">Local daemon (zoopd)</span>
          <span className="badge badge-neutral">Not detected</span>
        </div>
        <div className="inline-empty">
          Install and start <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>zoopd</code> to manage WireGuard tunnels from this device.
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Local daemon (zoopd)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-success">Online</span>
          <button className="btn btn-ghost btn-xs" onClick={refreshDaemon}>Refresh</button>
        </div>
      </div>
      <div className="info-row">
        <span className="info-key">Device name</span>
        <span className="info-val">{daemonStatus.device_name}</span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">Endpoint ID</span>
        <span className="info-val" style={{ fontSize: '0.75rem' }}>{daemonStatus.endpoint_id}</span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">WireGuard key</span>
        <span className="info-val" style={{ fontSize: '0.75rem' }}>{daemonStatus.wireguard_public_key?.slice(0, 24)}…</span>
        {daemonStatus.wireguard_public_key && (
          <button className="btn btn-ghost btn-xs" onClick={() => {
            navigator.clipboard.writeText(daemonStatus.wireguard_public_key ?? '');
            onToast?.('WireGuard public key copied');
          }}>
            <Ico d={I.copy} size={11} />Copy
          </button>
        )}
      </div>
      <div className="info-row">
        <span className="info-key">Listen port</span>
        <span className="info-val">{daemonStatus.listen_port}</span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">Cloud</span>
        <span className="info-val">
          {daemonStatus.cloud_reachable
            ? <span className="badge badge-success">Reachable</span>
            : <span className="badge badge-neutral">Unreachable</span>}
        </span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">Active tunnels</span>
        <span className="info-val">{activeTunnels} of {daemonStatus.active_tunnels}</span>
        <span />
      </div>
      <div className="info-row">
        <span className="info-key">Throughput</span>
        <span className="info-val" style={{ fontSize: '0.75rem' }}>↓ {fmt(totalRx)} · ↑ {fmt(totalTx)}</span>
        <span />
      </div>
      {daemonPeers.length > 0 && (
        <div style={{ padding: '12px 18px 14px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Live peers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {daemonPeers.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</span>
                <span className={`badge ${p.connected ? 'badge-success' : p.online ? 'badge-info' : 'badge-neutral'}`}>
                  {p.connected ? 'Connected' : p.online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Overview tab ────────────────────────────────────────────── */
const OverviewTab: React.FC<{ onRegister: () => void; onToast: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ onRegister, onToast }) => {
  const { deviceId, deviceName, deviceInfo, connections, connectionsLoading } = useApp();
  const pending = connections.filter(c => c.state === 'REQUESTED');

  if (!deviceId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Ico d={I.wifi} size={22} /></div>
        <h3>Not registered</h3>
        <p>Register this device with the Zoop control plane to get started.</p>
        <button className="btn btn-primary btn-sm" id="overview-register-btn" onClick={onRegister} style={{ marginTop: 8 }}>
          <Ico d={I.plus} />Register device
        </button>
      </div>
    );
  }

  return (
    <>
      <DaemonStatusCard onToast={onToast} />

      <div className="section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot online" />
            <span className="section-title">{deviceName}</span>
            <span className="badge badge-info">Registered</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => { navigator.clipboard.writeText(deviceId); onToast('Device ID copied'); }}>
            <Ico d={I.copy} size={11} />Copy ID
          </button>
        </div>
        <div className="info-row">
          <span className="info-key">Device ID</span>
          <span className="info-val" style={{ fontSize: '0.75rem' }}>{deviceId}</span>
          <span />
        </div>
        <div className="info-row">
          <span className="info-key">Platform</span>
          <span className="info-val">{deviceInfo?.platform ?? '—'}</span>
          <span />
        </div>
        {deviceInfo?.assigned_ip && (
          <div className="info-row">
            <span className="info-key">Assigned IP</span>
            <span className="info-val">{deviceInfo.assigned_ip}</span>
            <span />
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Pending connections</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {connectionsLoading ? 'Loading…' : `${pending.length} pending`}
          </span>
        </div>
        {pending.length === 0 && !connectionsLoading ? (
          <div className="inline-empty">No pending connection requests.</div>
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
const DevicesTab: React.FC<{ onRegister: () => void; onToast: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ onRegister, onToast }) => {
  const { deviceId, deviceName, deviceInfo, allDevices, devicesLoading, refreshAllDevices } = useApp();
  const [filter, setFilter] = useState('');

  const filteredDevices = allDevices.filter(d =>
    (d.name || '').toLowerCase().includes(filter.toLowerCase()) ||
    d.id.toString().toLowerCase().includes(filter.toLowerCase()) ||
    (d.platform || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      {deviceId && (
        <div className="section" style={{ marginBottom: 4 }}>
          <div className="section-header"><span className="section-title">This device session</span></div>
          <div className="info-row">
            <span className="info-key">Device name</span>
            <span className="info-val">{deviceName}</span>
            <span />
          </div>
          <div className="info-row">
            <span className="info-key">Device ID</span>
            <span className="info-val" style={{ fontSize: '0.75rem' }}>{deviceId}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => {
              navigator.clipboard.writeText(deviceId);
              onToast('Device ID copied');
            }}>
              <Ico d={I.copy} size={11} />Copy
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
        <div className="section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="section-title">Fleet devices ({allDevices.length})</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                padding: '5px 10px', fontSize: '0.8125rem', borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)',
                outline: 'none', width: 160,
              }}
            />
            <button className="btn btn-ghost btn-xs" onClick={refreshAllDevices}>
              {devicesLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
            </button>
            <button className="btn btn-primary btn-xs" onClick={onRegister}>
              <Ico d={I.plus} />Register new
            </button>
          </div>
        </div>
        {allDevices.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <div className="empty-icon"><Ico d={I.monitor} size={22} /></div>
            <h3>No devices registered</h3>
            <p>Register a device to add it to the control plane registry.</p>
            <button className="btn btn-primary btn-sm" onClick={onRegister} style={{ marginTop: 8 }}>
              <Ico d={I.plus} />Register device
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Device ID</th>
                  <th>Platform</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map(d => (
                  <tr key={d.id.toString()}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || 'Unnamed device'}</span>
                      {d.id.toString() === deviceId && <span className="badge badge-info" style={{ marginLeft: 8 }}>Current</span>}
                    </td>
                    <td
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: 'pointer' }}
                      title="Click to copy"
                      onClick={() => {
                        navigator.clipboard.writeText(d.id.toString());
                        onToast(`Copied ${d.name || 'device'} ID`);
                      }}
                    >
                      {d.id.toString()}
                    </td>
                    <td>{d.os || d.platform || '—'}</td>
                    <td>
                      <span className={`badge ${d.status === 'trusted' || d.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Connections tab ─────────────────────────────────────────── */
const stateBadge = (s: string) => {
  switch (s) {
    case 'CONNECTED':   return <span className="badge badge-success">{s}</span>;
    case 'REQUESTED':   return <span className="badge badge-warning">{s}</span>;
    case 'AUTHORIZED':
    case 'CONNECTING':  return <span className="badge badge-info">{s}</span>;
    default:            return <span className="badge badge-neutral">{s}</span>;
  }
};

const ConnectionsTab: React.FC<{
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onGoToSharing: () => void;
}> = ({ onToast, onGoToSharing }) => {
  const {
    deviceId, connections, connectionsLoading, connectionsError, allDevices, shares,
    doConnect, doDisconnect, doAcceptConnection, refreshConnections,
  } = useApp();
  const [providerId, setProviderId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [busyConn, setBusyConn] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const byId = new Map(allDevices.map(d => [d.id.toString(), d.name || 'Unnamed device']));
    return (id: string): string | null => byId.get(id) ?? null;
  }, [allDevices]);

  const providerIds = useMemo(() => {
    const ids = new Set<string>();
    if (!deviceId) return ids;
    for (const s of shares) {
      const active = s.is_active === true || s.status === 'active' || (s.is_active === undefined && s.status === undefined);
      if (s.recipient_id && s.recipient_id.toString() === deviceId && active && s.provider_id) {
        ids.add(s.provider_id.toString());
      }
    }
    return ids;
  }, [shares, deviceId]);

  const providers = useMemo(
    () => allDevices.filter(d => providerIds.has(d.id.toString())),
    [allDevices, providerIds],
  );

  const pending = connections.filter(c => c.state === 'REQUESTED');
  const active = connections.filter(c => ['CONNECTED', 'CONNECTING', 'AUTHORIZED'].includes(c.state));
  const isLoading = connectionsLoading && connections.length === 0;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await doConnect(providerId.trim());
      onToast('Connection request sent to provider', 'success');
      setProviderId('');
      refreshConnections();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setConnectError(msg);
      onToast(msg, 'error');
    } finally {
      setConnecting(false);
    }
  };

  const runDisconnect = async (id: string, successMsg: string) => {
    setBusyConn(id);
    try {
      await doDisconnect(id);
      setConfirmingDecline(null);
      refreshConnections();
      onToast(successMsg, 'info');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusyConn(null);
    }
  };

  const runAccept = async (id: string) => {
    setBusyConn(id);
    try {
      await doAcceptConnection(id);
      onToast('Connection request approved', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to approve request', 'error');
    } finally {
      setBusyConn(null);
    }
  };

  const PeerCell: React.FC<{ id: string; name: string | null }> = ({ id, name }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{name ?? 'Unnamed device'}</span>
      <span
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
        title="Click to copy Device ID"
        onClick={() => { navigator.clipboard.writeText(id); onToast(`Copied device ID`); }}
      >
        {id.slice(0, 8)}… <Ico d={I.copy} size={9} />
      </span>
    </div>
  );

  const Spin = () => <span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />;

  if (!deviceId) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Ico d={I.zap} size={22} /></div>
        <h3>Not registered</h3>
        <p>Register this device first to manage connections.</p>
      </div>
    );
  }

  return (
    <>
      {connectError && (
        <div className="error-banner" role="alert">
          <Ico d={I.alert} />
          <span style={{ flex: 1 }}>{connectError}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setConnectError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {connectionsError && (
        <div className="error-banner" role="alert">
          <Ico d={I.alert} />
          <span style={{ flex: 1 }}>Could not load connections from the control plane.</span>
          <button className="btn btn-secondary btn-xs" onClick={refreshConnections}>Retry</button>
        </div>
      )}

      {/* Initiate connection */}
      <div className="section">
        <div className="section-header"><span className="section-title">Initiate connection</span></div>
        {providers.length > 0 ? (
          <>
            <form onSubmit={handleConnect} className="conn-form">
              <div className="field">
                <label htmlFor="conn-provider-id">Provider device</label>
                <select id="conn-provider-id" value={providerId} onChange={e => setProviderId(e.target.value)} required>
                  <option value="" disabled>Select a provider device…</option>
                  {providers.map(d => (
                    <option key={d.id.toString()} value={d.id.toString()}>
                      {d.name || 'Unnamed device'} — {d.id.toString().slice(0, 8)}…
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" id="connect-btn" disabled={connecting || !providerId}>
                {connecting ? <><Spin />Connecting…</> : <><Ico d={I.zap} />Connect</>}
              </button>
            </form>
            <div className="conn-hint">
              Only devices that have authorized you as a recipient are listed here.
            </div>
          </>
        ) : (
          <div className="conn-empty-providers">
            <div className="empty-icon" style={{ width: 40, height: 40, flexShrink: 0 }}><Ico d={I.share} size={18} /></div>
            <div>
              <h3>No providers available</h3>
              <p>To connect through a device, it must first authorize you as a recipient.</p>
              <button className="btn btn-secondary btn-sm" onClick={onGoToSharing}>
                <Ico d={I.share} />Go to Sharing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending requests */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Pending requests ({pending.length})</span>
          <span className="section-note">Awaiting action</span>
        </div>
        {isLoading ? (
          <div className="inline-empty"><span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Loading connections…</div>
        ) : pending.length === 0 ? (
          <div className="inline-empty">No pending connection requests.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Peer</th><th>Direction</th><th>State</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {pending.map(c => {
                  const isProvider = c.provider_id.toString() === deviceId;
                  const peerId = isProvider ? c.recipient_id.toString() : c.provider_id.toString();
                  const peerName = nameOf(peerId);
                  const isBusy = busyConn === c.id.toString();
                  const confirming = confirmingDecline === c.id.toString();
                  return (
                    <tr key={c.id.toString()}>
                      <td><PeerCell id={peerId} name={peerName} /></td>
                      <td>
                        {isProvider
                          ? <span className="badge badge-warning">Incoming</span>
                          : <span className="badge badge-info">Awaiting approval</span>}
                      </td>
                      <td>{stateBadge(c.state)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isProvider ? (
                          <>
                            <button className="btn btn-primary btn-xs" style={{ marginRight: 6 }}
                              disabled={isBusy} onClick={() => runAccept(c.id.toString())}
                              aria-label={`Accept connection from ${peerName ?? peerId}`}>
                              {isBusy ? <><Spin />Accepting…</> : <><Ico d={I.check} size={11} />Accept</>}
                            </button>
                            {confirming ? (
                              <>
                                <button className="btn btn-danger btn-xs" style={{ marginRight: 6 }}
                                  disabled={isBusy} onClick={() => runDisconnect(c.id.toString(), 'Request declined')}
                                  aria-label="Confirm decline">
                                  {isBusy ? <><Spin />Declining…</> : 'Confirm'}
                                </button>
                                <button className="btn btn-ghost btn-xs" disabled={isBusy} onClick={() => setConfirmingDecline(null)}>Cancel</button>
                              </>
                            ) : (
                              <button className="btn btn-danger btn-xs btn-outline" onClick={() => setConfirmingDecline(c.id.toString())}
                                aria-label={`Decline connection from ${peerName ?? peerId}`}>
                                <Ico d={I.wifiOff} size={11} />Decline
                              </button>
                            )}
                          </>
                        ) : (
                          <button className="btn btn-ghost btn-xs" disabled={isBusy}
                            onClick={() => runDisconnect(c.id.toString(), 'Request cancelled')}
                            aria-label={`Cancel request to ${peerName ?? peerId}`}>
                            {isBusy ? <><Spin />Cancelling…</> : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active connections */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Active connections ({active.length})</span>
          <button className="btn btn-ghost btn-xs" id="refresh-connections-btn" onClick={refreshConnections}>
            {connectionsLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {isLoading ? (
          <div className="inline-empty"><span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />Loading connections…</div>
        ) : active.length === 0 ? (
          <div className="inline-empty">No active connections. Initiate a connection above to start routing traffic.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Peer</th><th>Direction</th><th>State</th><th>Tunnel IP</th><th /></tr></thead>
              <tbody>
                {active.map(c => {
                  const isProvider = c.provider_id.toString() === deviceId;
                  const peerId = isProvider ? c.recipient_id.toString() : c.provider_id.toString();
                  const peerName = nameOf(peerId);
                  const isBusy = busyConn === c.id.toString();
                  return (
                    <tr key={c.id.toString()}>
                      <td><PeerCell id={peerId} name={peerName} /></td>
                      <td>
                        {isProvider
                          ? <span className="badge badge-info">Providing</span>
                          : <span className="badge badge-neutral">Receiving</span>}
                      </td>
                      <td>{stateBadge(c.state)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {isProvider ? c.recipient_ip ?? '—' : c.provider_ip ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-xs" disabled={isBusy}
                          onClick={() => runDisconnect(c.id.toString(), 'Disconnected')}
                          aria-label={`Disconnect from ${peerName ?? peerId}`}>
                          {isBusy ? <><Spin />Disconnecting…</> : <><Ico d={I.wifiOff} size={11} />Disconnect</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Sharing tab ─────────────────────────────────────────────── */
const SharingTab: React.FC<{ onToast: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ onToast }) => {
  const { deviceId, shares, allDevices, doCreateShare } = useApp();
  const [recipientId, setRecipientId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const candidates = allDevices.filter(d => d.id.toString() !== deviceId);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId.trim()) return;
    setSharing(true);
    setShareError(null);
    try {
      await doCreateShare(recipientId.trim());
      onToast('Share relationship authorized', 'success');
      setRecipientId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create share';
      setShareError(msg);
      onToast(msg, 'error');
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
        <div className="section-header"><span className="section-title">Authorize recipient</span></div>
        <form onSubmit={handleShare} style={{ padding: '18px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label>Recipient device</label>
            {candidates.length > 0 ? (
              <select id="share-recipient-id" value={recipientId} onChange={e => setRecipientId(e.target.value)} required>
                <option value="" disabled>Select a registered device…</option>
                {candidates.map(d => (
                  <option key={d.id.toString()} value={d.id.toString()}>
                    {d.name || 'Unnamed device'} — {d.id.toString().slice(0, 8)}…
                  </option>
                ))}
              </select>
            ) : (
              <input id="share-recipient-id" type="text" value={recipientId} onChange={e => setRecipientId(e.target.value)}
                placeholder="Recipient's device ID" required />
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-sm" id="share-create-btn" disabled={sharing}>
            {sharing ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
            Authorize
          </button>
        </form>
        <div className="conn-hint">
          Sharing lets this device act as a provider — the recipient can route traffic through it.
        </div>
      </div>

      <div className="section">
        <div className="section-header"><span className="section-title">Active shares ({shares.length})</span></div>
        {shares.length === 0 ? (
          <div className="inline-empty">No sharing relationships yet. Authorize a recipient above.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Direction</th><th>Peer</th><th>Status</th></tr></thead>
            <tbody>
              {shares.map(s => {
                const isProvider = s.provider_id.toString() === deviceId;
                return (
                  <tr key={s.id.toString()}>
                    <td>{isProvider ? <span className="badge badge-info">Provider</span> : <span className="badge badge-neutral">Recipient</span>}</td>
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
const SettingsTab: React.FC<{
  onSwitch: (m: PortalMode) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onSwitch, onToast }) => {
  const { user, deviceId, deviceName, deviceInfo, unregister, logout } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  const handleUnregister = async () => {
    setUnregistering(true);
    try {
      await unregister();
      onToast('Device identity removed', 'info');
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Unregistration failed', 'error');
    } finally {
      setUnregistering(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onToast('Signed out of Zoop account', 'info');
    onSwitch('auth');
  };

  return (
    <>
      {/* Account Identity */}
      <div className="section settings-section">
        <div className="settings-section-header">
          <h3>Account profile</h3>
          <p>Authenticated user identity and account subscription tier.</p>
        </div>
        <div className="info-row">
          <span className="info-key">Name</span>
          <span className="info-val">{user?.name ?? (deviceName ? `${deviceName} Owner` : 'Local User')}</span>
          <span />
        </div>
        <div className="info-row">
          <span className="info-key">Zoop ID</span>
          <span className="info-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{user?.zoopId ?? user?.id ?? '—'}</span>
          <span />
        </div>
        <div className="info-row">
          <span className="info-key">Username</span>
          <span className="info-val">@{user?.username ?? '—'}</span>
          <span />
        </div>
        <div className="info-row">
          <span className="info-key">Plan</span>
          <span className="info-val">
            <span className="badge badge-info">{user?.plan?.toUpperCase() ?? 'FREE PLAN'}</span>
          </span>
          <span />
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onSwitch('auth')}>
            Switch Account / Sign In
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: 'var(--red)' }}>
            <Ico d={I.logOut} />Sign Out
          </button>
        </div>
      </div>

      {/* Device Identity */}
      <div className="section settings-section" style={{ marginTop: 20 }}>
        <div className="settings-section-header">
          <h3>Device identity</h3>
          <p>Cryptographic device identity registered with the Zoop control plane.</p>
        </div>
        <div className="info-row">
          <span className="info-key">Device name</span>
          <span className="info-val">{deviceName ?? '—'}</span>
          <span />
        </div>
        <div className="info-row">
          <span className="info-key">Device ID</span>
          <span className="info-val" style={{ fontSize: '0.75rem' }}>{deviceId ?? '—'}</span>
          {deviceId && (
            <button className="btn btn-ghost btn-xs" onClick={() => { navigator.clipboard.writeText(deviceId); onToast('Device ID copied'); }}>
              <Ico d={I.copy} size={11} />Copy
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
          <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border-subtle)' }}>
            {confirming ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
                  Remove this device from the control plane? This deletes its identity and cannot be undone.
                </span>
                <button className="btn btn-danger btn-sm" id="settings-unregister-confirm-btn"
                  disabled={unregistering} onClick={handleUnregister}>
                  {unregistering ? <span className="spinner" style={{ width: 13, height: 13 }} /> : null}Unregister
                </button>
                <button className="btn btn-ghost btn-sm" disabled={unregistering} onClick={() => setConfirming(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" id="settings-unregister-btn"
                onClick={() => setConfirming(true)} style={{ color: 'var(--red)' }}>
                <Ico d={I.logOut} />Unregister device
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Main UserDashboard — modern nav ─────────────────────────── */
export const UserDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const { user, deviceId, deviceName, allDevices, connections } = useApp();
  const [tab, setTab] = useState<UserTab>('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const navCounts: Record<UserTab, number | null> = {
    overview: null,
    devices: allDevices.length || null,
    connections: connections.filter(c => ['REQUESTED','CONNECTING','CONNECTED','AUTHORIZED'].includes(c.state)).length || null,
    sharing: null,
    settings: null,
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const TAB_TITLES: Record<UserTab, string> = {
    overview:    'Overview',
    devices:     'Devices',
    connections: 'Connections',
    sharing:     'Sharing',
    settings:    'Settings',
  };

  const handleRegisterDirect = () => {
    onSwitch('auth');
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="portal" role="main">
      {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} aria-hidden />}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Navigation">
        {/* Brand — matches landing: Zoop Internet */}
        <div className="sidebar-brand" onClick={() => onSwitch('landing')} style={{ cursor: 'pointer', gap: 8 }}>
          <div className="sidebar-brand-icon" style={{ width: 32, height: 32, borderRadius: 8, background: '#000', border: '1px solid rgba(8,242,255,0.3)', boxShadow: '0 0 10px rgba(8,242,255,0.15)' }}>
            <img src="/zoopicontransparent.png" alt="Zoop Internet" width={24} height={24} />
          </div>
          <div className="sidebar-brand-name">Zoop</div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99, background: 'rgba(8,242,255,0.12)', color: '#38bdf8', border: '1px solid rgba(8,242,255,0.28)' }}>Internet</span>
        </div>

        <WorkspaceSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="User navigation">
          <div className="nav-section-label">Personal</div>
          {NAV.map(item => (
            <button key={item.id} id={`nav-${item.id}`}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              aria-current={tab === item.id ? 'page' : undefined}>
              <span className="nav-icon-box">{item.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {navCounts[item.id] != null && (
                <span className="nav-count">{navCounts[item.id]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            id="user-profile-area"
            onClick={() => { setTab('settings'); setSidebarOpen(false); }}
            title="Open Account & Settings"
            style={{ cursor: 'pointer' }}
          >
            <div className="sidebar-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : <Ico d={I.user} size={14} />}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || deviceName || 'Personal User'}</div>
              <div className="sidebar-user-role">{user?.username ? `@${user.username} · ${user.zoopId}` : (deviceId ? 'Personal device' : 'Tap to sign in')}</div>
            </div>
            <Ico d={I.chevronR} size={12} />
          </div>
        </div>
      </aside>

      <div className="portal-content">
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen}>
              <Ico d={sidebarOpen ? I.close : I.menu} size={18} />
            </button>
            <h1 className="page-title"><span className="page-title-dot" aria-hidden />{TAB_TITLES[tab]}</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }} className="hide-mobile">{deviceName ? `· ${deviceName}` : ''}</span>
          </div>
          <div className="page-header-actions">
            {!deviceId ? (
              <button className="btn btn-primary btn-sm" id="header-register-btn" onClick={handleRegisterDirect}>
                <Ico d={I.plus} />Sign In / Register
              </button>
            ) : (
              <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{connections.filter(c=>c.state==='CONNECTED').length} tunnels</span>
            )}
          </div>
        </header>

        <div className="page-body">
          {tab === 'overview'    && <OverviewTab onRegister={handleRegisterDirect} onToast={addToast} />}
          {tab === 'devices'     && <DevicesTab  onRegister={handleRegisterDirect} onToast={addToast} />}
          {tab === 'connections' && <ConnectionsTab onToast={addToast} onGoToSharing={() => setTab('sharing')} />}
          {tab === 'sharing'     && <SharingTab onToast={addToast} />}
          {tab === 'settings'    && <SettingsTab onSwitch={onSwitch} onToast={addToast} />}
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default UserDashboard;
