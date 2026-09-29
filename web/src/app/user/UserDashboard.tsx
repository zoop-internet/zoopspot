import React, { useState, useEffect, useMemo } from 'react';
import type { PortalMode } from '../../types';
import type { ApiWallet, ApiPaymentTransaction, ApiEarningRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';
import { MobileBottomNav } from '../../components/MobileBottomNav';
import { isDaemonMixedContentBlocked } from '../../api/daemon';
import {
  getWallet,
  depositMobileMoney,
  depositCard,
  withdraw,
  getWalletTransactions,
  getWalletEarnings,
} from '../../api/client';

import { Icons } from '../../components/iconDefs';
import { AwsSpinner } from '../../components/AwsSpinner';
import { HotspotsTab } from './HotspotsTab';

/* ─── Icon helpers ───────────────────────────────────────────── */
const Ico: React.FC<{ d: string | React.ReactNode; size?: number }> = ({ d, size = 15 }) =>
  typeof d === 'string'
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d as string}/></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;

const I = Icons;

/* ─── Tab types ───────────────────────────────────────────────── */
type UserTab = 'hotspots' | 'overview' | 'wallet' | 'settings';

const NAV: { id: UserTab; label: string; icon: React.ReactNode }[] = [
  { id: 'hotspots', label: 'Hotspots & Routers', icon: <Ico d={I.wifi} /> },
  { id: 'overview', label: 'Network Overview',   icon: <Ico d={I.home} /> },
  { id: 'wallet',   label: 'Wallet & Payouts',   icon: <Ico d={I.wallet} /> },
  { id: 'settings', label: 'Settings',           icon: <Ico d={I.settings} /> },
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
          <span style={{ marginRight: 8, display: 'inline-flex' }}><AwsSpinner size={14} /></span>
          Checking for daemon on 127.0.0.1:9090…
        </div>
      </div>
    );
  }

  if (!localMode || !daemonStatus) {
    const blocked = isDaemonMixedContentBlocked();
    return (
      <div className="section">
        <div className="section-header">
          <span className="section-title">Local daemon (zoopd)</span>
          <span className="badge badge-neutral">Not detected</span>
        </div>
        <div className="inline-empty" style={{ flexDirection: 'column', gap: 6 }}>
          <div>
            Install and start <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>zoopd</code> to manage WireGuard tunnels from this device.
          </div>
          {blocked && (
            <div style={{ fontSize: '0.75rem', color: 'var(--amber)', maxWidth: 520, lineHeight: 1.5 }}>
              Page is on <b>https</b> — browsers block plain <code>http://127.0.0.1:9090</code> as mixed-content. Open via <code>http://localhost:5173</code> for local daemon or set <code>VITE_DAEMON_BASE</code> to an https tunnel.
            </div>
          )}
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
  const { user, deviceId, deviceName, deviceInfo, connections, connectionsLoading, isRegistering } = useApp();
  const pending = connections.filter(c => c.state === 'REQUESTED');

  if (!deviceId) {
    return (
      <div className="section" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="empty-state" style={{ padding: '48px 24px 32px' }}>
          <div className="empty-icon"><Ico d={I.wifi} size={22} /></div>
          <h3 style={{ marginTop: 6 }}>{user ? 'Connect this device' : 'Connect this device in 30 seconds'}</h3>
          <p style={{ maxWidth: 520 }}>
            {user ? (
              <>Signed in as <strong style={{ color: 'var(--text-primary)' }}>@{user.username || user.name}</strong>. Connect this browser to create your cryptographic identity and link to your private mesh.</>
            ) : (
              'Register to create your encrypted WireGuard identity. Zoop links your devices directly — no VPN server in the middle.'
            )}
          </p>
          <button className="btn btn-primary" id="overview-register-btn" onClick={onRegister} disabled={isRegistering} style={{ marginTop: 8 }}>
            {isRegistering ? (
              <><AwsSpinner size={14} variant="inverted" /><span>Connecting device…</span></>
            ) : (
              <><Ico d={I.plus} />Connect this device — free</>
            )}
          </button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>WireGuard® · Ed25519 · Open source MIT · No tracking</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
          {[
            { n: '01', t: 'Register', d: 'Creates your Ed25519 identity + WireGuard keys. This device only.' },
            { n: '02', t: 'Share (you provide)', d: 'Authorize who may borrow your internet — go to Sharing.' },
            { n: '03', t: 'Connect (you borrow)', d: 'Borrow internet from a provider that authorized you — go to Connections.' },
          ].map(s => (
            <div key={s.n} style={{ padding: '16px 18px', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: 4 }}>{s.t}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>{s.d}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)' }}>
          <span className="badge badge-info">30 sec setup</span>
          <span className="badge badge-neutral">Works behind NAT/CGNAT</span>
          <span className="badge badge-success">End-to-end encrypted</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <DaemonStatusCard onToast={onToast} />

      {/* Share vs Connect — 5-sec comprehension aid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#34d399' }}><Ico d={I.share} size={14} /></span>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#34d399' }}>Sharing — you PROVIDE</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Authorize a device to borrow <strong style={{ color: 'var(--text-secondary)' }}>your</strong> internet. Go to <strong>Sharing</strong> → Authorize.</div>
          </div>
        </div>
        <div style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#38bdf8' }}><Ico d={I.zap} size={14} /></span>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8' }}>Connections — you BORROW</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Connect via a provider that authorized you. Go to <strong>Connections</strong> → Connect.</div>
          </div>
        </div>
      </div>

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
          <div className="table-wrap">
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
          </div>
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
            {user ? 'Switch Account' : 'Sign In / Register'}
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
                  {unregistering ? <span style={{ marginRight: 6, display: 'inline-flex' }}><AwsSpinner size={13} variant="inverted" /></span> : null}Unregister
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

/* ─── Uganda Telecom Utilities ────────────────────────────────── */
function detectUgandaNetwork(phone: string): 'mtn' | 'airtel' | 'unknown' {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const norm = cleaned.startsWith('0')
    ? `+256${cleaned.slice(1)}`
    : (cleaned.startsWith('256')
      ? `+${cleaned}`
      : (cleaned.startsWith('+') ? cleaned : `+256${cleaned}`));
  if (norm.length >= 6) {
    const prefix = norm.slice(4, 6);
    if (['77', '78', '76', '39'].includes(prefix)) return 'mtn';
    if (['70', '75', '74'].includes(prefix)) return 'airtel';
  }
  return 'unknown';
}

function formatUgandaPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '').trim();
  if (cleaned.startsWith('0')) return `+256${cleaned.slice(1)}`;
  if (cleaned.startsWith('256')) return `+${cleaned}`;
  if (!cleaned.startsWith('+')) return `+256${cleaned}`;
  return cleaned;
}

function formatUgx(num: number): string {
  return `UGX ${Math.round(num).toLocaleString()}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/* ─── Wallet & Earnings Tab ──────────────────────────────────── */
const WalletTab: React.FC<{
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ onToast }) => {
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [transactions, setTransactions] = useState<ApiPaymentTransaction[]>([]);
  const [earnings, setEarnings] = useState<ApiEarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit form state
  const [depositMethod, setDepositMethod] = useState<'mtn' | 'airtel' | 'card'>('mtn');
  const [depositAmount, setDepositAmount] = useState<number>(25000);
  const [customDeposit, setCustomDeposit] = useState<string>('');
  const [depositPhone, setDepositPhone] = useState<string>('+256 ');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawPhone, setWithdrawPhone] = useState<string>('+256 ');
  const [withdrawProvider, setWithdrawProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Filters
  const [txFilter, setTxFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'earning'>('all');

  const loadData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [w, txs, earn] = await Promise.all([
        getWallet(),
        getWalletTransactions(50, 0),
        getWalletEarnings(50, 0),
      ]);
      setWallet(w);
      setTransactions(txs);
      setEarnings(earn);
      if (w && withdrawAmount === 0 && w.unwithdrawn_earnings > 0) {
        setWithdrawAmount(w.unwithdrawn_earnings);
      }
    } catch (err: any) {
      console.error('Failed to load wallet ledger:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [withdrawAmount]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle phone change in deposit modal to auto-select network
  const handleDepositPhoneChange = (val: string) => {
    setDepositPhone(val);
    const net = detectUgandaNetwork(val);
    if (net === 'mtn' && depositMethod !== 'mtn') setDepositMethod('mtn');
    else if (net === 'airtel' && depositMethod !== 'airtel') setDepositMethod('airtel');
  };

  // Handle phone change in withdraw modal
  const handleWithdrawPhoneChange = (val: string) => {
    setWithdrawPhone(val);
    const net = detectUgandaNetwork(val);
    if (net === 'mtn' && withdrawProvider !== 'mtn') setWithdrawProvider('mtn');
    else if (net === 'airtel' && withdrawProvider !== 'airtel') setWithdrawProvider('airtel');
  };

  // Submit deposit
  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAmount = customDeposit ? Number(customDeposit) : depositAmount;
    if (!effectiveAmount || effectiveAmount <= 0) {
      onToast('Please enter a valid deposit amount', 'error');
      return;
    }

    setSubmittingDeposit(true);
    try {
      if (depositMethod === 'card') {
        const tx = await depositCard(effectiveAmount, window.location.href);
        onToast(`Card checkout initiated for ${formatUgx(effectiveAmount)}. Ref: ${tx.reference_id}`, 'success');
        if (tx.redirect_url) {
          window.open(tx.redirect_url, '_blank');
        }
      } else {
        const formatted = formatUgandaPhone(depositPhone);
        const tx = await depositMobileMoney(effectiveAmount, formatted, depositMethod);
        onToast(`Payment prompt sent to ${formatted} for ${formatUgx(effectiveAmount)}. Ref: ${tx.reference_id}`, 'success');
      }
      setShowDepositModal(false);
      setCustomDeposit('');
      await loadData(true);
    } catch (err: any) {
      onToast(err.message || 'Deposit initiation failed', 'error');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Submit withdraw
  const handleConfirmWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) {
      onToast('Please enter a valid payout amount', 'error');
      return;
    }
    const max = wallet?.unwithdrawn_earnings ?? 0;
    if (withdrawAmount > max) {
      onToast(`Amount exceeds available unwithdrawn earnings (${formatUgx(max)})`, 'error');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const formatted = formatUgandaPhone(withdrawPhone);
      const tx = await withdraw(withdrawAmount, formatted, withdrawProvider);
      onToast(`Withdrawal of ${formatUgx(withdrawAmount)} to ${formatted} initiated. Ref: ${tx.reference_id}`, 'success');
      setShowWithdrawModal(false);
      await loadData(true);
    } catch (err: any) {
      onToast(err.message || 'Withdrawal initiation failed', 'error');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const filteredTxs = useMemo(() => {
    if (txFilter === 'all') return transactions;
    return transactions.filter(t => t.type === txFilter);
  }, [transactions, txFilter]);

  const availableBal = wallet?.available_balance ?? 0;
  const pendingBal = wallet?.pending_balance ?? 0;
  const totalEarned = wallet?.total_earned ?? 0;
  const unwithdrawn = wallet?.unwithdrawn_earnings ?? 0;
  const transferFee = 500;
  const netWithdraw = Math.max(0, withdrawAmount - transferFee);

  return (
    <>
      {/* ─── Top Balance Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="section" style={{ padding: '20px', borderLeft: '3px solid var(--accent-green)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Balance</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, letterSpacing: '-0.02em' }}>
            {formatUgx(availableBal)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Usable for mesh bandwidth & WireGuard egress
          </div>
        </div>

        <div className="section" style={{ padding: '20px', borderLeft: '3px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Inflow</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, letterSpacing: '-0.02em' }}>
            {formatUgx(pendingBal)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Awaiting telecom network confirmation
          </div>
        </div>

        <div className="section" style={{ padding: '20px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lifetime Egress Rewards</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, letterSpacing: '-0.02em' }}>
            {formatUgx(totalEarned)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Earned by relaying traffic as an edge provider
          </div>
        </div>

        <div className="section" style={{ padding: '20px', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unwithdrawn Earnings</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#38bdf8', marginTop: 6, letterSpacing: '-0.02em' }}>
            {formatUgx(unwithdrawn)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Ready to disburse to MTN or Airtel
          </div>
        </div>
      </div>

      {/* ─── Action Bar ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setShowDepositModal(true)}>
            <Ico d={I.plus} />Add Funds
          </button>
          <button className="btn btn-ghost" onClick={() => {
            setWithdrawAmount(unwithdrawn);
            setShowWithdrawModal(true);
          }} disabled={unwithdrawn <= 0}>
            <Ico d={I.creditCard} />Withdraw to Mobile Money
          </button>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={() => loadData(true)} disabled={refreshing}>
          {refreshing ? <span style={{ marginRight: 6, display: 'inline-flex' }}><AwsSpinner size={12} /></span> : null}
          Refresh Ledger
        </button>
      </div>

      {/* ─── Transaction History ─── */}
      <div className="section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="section-title">Transactions</span>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface-2)', padding: '2px 4px', borderRadius: 6 }}>
              {(['all', 'deposit', 'withdrawal', 'earning'] as const).map(f => (
                <button
                  key={f}
                  className={`btn btn-xs ${txFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.72rem', padding: '2px 8px' }}
                  onClick={() => setTxFilter(f)}
                >
                  {f === 'earning' ? 'Rewards' : f}
                </button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {filteredTxs.length} records
          </span>
        </div>

        {loading ? (
          <div className="inline-empty">
            <span style={{ marginRight: 8, display: 'inline-flex' }}><AwsSpinner size={16} /></span> Loading transactions…
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="inline-empty" style={{ padding: '32px 16px', flexDirection: 'column', gap: 6 }}>
            <Ico d={I.wallet} size={28} />
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No transactions yet</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add funds or relay traffic to see your ledger activity here.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Details</th>
                  <th style={{ padding: '10px 14px' }}>Method</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map(tx => {
                  const isPositive = tx.type === 'deposit' || tx.type === 'earning';
                  return (
                    <tr key={tx.id || tx.reference_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: tx.status === 'completed' ? 'var(--accent-green)' : (tx.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-amber)')
                          }} />
                          {tx.type === 'deposit' ? 'Funds Added' : (tx.type === 'withdrawal' ? 'Payout' : (tx.type === 'earning' ? 'Egress Reward' : 'Tunnel Usage'))}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div>{tx.description || tx.reference_id}</div>
                        {tx.gateway_reference && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Ref: {tx.gateway_reference}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {tx.payment_method?.includes('mtn') ? (
                          <span className="badge" style={{ background: 'rgba(255,204,0,0.15)', color: '#ffcc00', border: '1px solid rgba(255,204,0,0.3)' }}>MTN MoMo</span>
                        ) : tx.payment_method?.includes('airtel') ? (
                          <span className="badge" style={{ background: 'rgba(255,32,32,0.15)', color: '#ff5050', border: '1px solid rgba(255,32,32,0.3)' }}>Airtel Money</span>
                        ) : tx.payment_method?.includes('card') ? (
                          <span className="badge badge-info">Card</span>
                        ) : (
                          <span className="badge badge-neutral">Mesh Protocol</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {tx.status === 'completed' ? (
                          <span className="badge badge-success">Completed</span>
                        ) : tx.status === 'failed' ? (
                          <span className="badge badge-danger">Failed</span>
                        ) : (
                          <span className="badge badge-neutral" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-amber)' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isPositive ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {isPositive ? '+' : '-'}{formatUgx(tx.amount)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Egress Relay Rewards Ledger ─── */}
      {earnings.length > 0 && (
        <div className="section" style={{ marginTop: 20 }}>
          <div className="section-header">
            <span className="section-title">Egress Relay Rewards</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{earnings.length} relay sessions</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Peer ID</th>
                  <th style={{ padding: '10px 14px' }}>Reward Source</th>
                  <th style={{ padding: '10px 14px' }}>Relayed Data</th>
                  <th style={{ padding: '10px 14px' }}>Session Duration</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Credited</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      {e.peer_endpoint_id ? `${e.peer_endpoint_id.slice(0, 8)}…` : 'Mesh Consumer'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {e.source === 'bandwidth_relay' ? 'Bandwidth Relay' : e.source}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)' }}>
                      {formatBytes(e.bytes_served)}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {e.duration_seconds}s
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                      +{formatUgx(e.amount)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {e.recorded_at ? new Date(e.recorded_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Deposit Modal ─── */}
      {showDepositModal && (
        <div className="modal-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setShowDepositModal(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deposit-title" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span id="deposit-title" className="modal-title">Add Funds to Wallet</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowDepositModal(false)}>✕</button>
            </div>

            <form onSubmit={handleConfirmDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Method tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setDepositMethod('mtn')}
                  className={`btn btn-sm ${depositMethod === 'mtn' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderColor: depositMethod === 'mtn' ? '#ffcc00' : undefined,
                    color: depositMethod === 'mtn' ? '#ffcc00' : undefined,
                  }}
                >
                  MTN MoMo
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMethod('airtel')}
                  className={`btn btn-sm ${depositMethod === 'airtel' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderColor: depositMethod === 'airtel' ? '#ff5050' : undefined,
                    color: depositMethod === 'airtel' ? '#ff5050' : undefined,
                  }}
                >
                  Airtel Money
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMethod('card')}
                  className={`btn btn-sm ${depositMethod === 'card' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  Card (Visa/MC)
                </button>
              </div>

              {/* Amount selector */}
              <div className="field">
                <label>Select Amount (UGX)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[5000, 10000, 25000, 50000, 100000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className={`btn btn-xs ${!customDeposit && depositAmount === amt ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => { setDepositAmount(amt); setCustomDeposit(''); }}
                      style={{ fontSize: '0.72rem', padding: '6px 2px' }}
                    >
                      {(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Or enter custom amount in UGX"
                  value={customDeposit}
                  onChange={e => setCustomDeposit(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </div>

              {/* Phone number for mobile money — modern autocomplete + inputMode */}
              {depositMethod !== 'card' && (
                <div className="field">
                  <label htmlFor="deposit-phone">Handset Phone Number (+256...)</label>
                  <input
                    id="deposit-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    value={depositPhone}
                    onChange={e => handleDepositPhoneChange(e.target.value)}
                    placeholder="+256 770 000000"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {depositMethod === 'mtn'
                      ? 'Instant USSD push prompt will be sent to your MTN SIM'
                      : 'Instant USSD push prompt will be sent to your Airtel SIM'}
                  </span>
                </div>
              )}

              {depositMethod === 'card' && (
                <div style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  You will be securely redirected to complete checkout via Visa / Mastercard.
                </div>
              )}

              <div style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Total Amount</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatUgx(customDeposit ? Number(customDeposit) || 0 : depositAmount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>Processing Fee</span>
                  <span>Free (UGX 0)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDepositModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingDeposit}>
                  {submittingDeposit ? <span style={{ marginRight: 6, display: 'inline-flex' }}><AwsSpinner size={13} variant="inverted" /></span> : null}
                  Confirm & Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Withdraw Modal ─── */}
      {showWithdrawModal && (
        <div className="modal-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) setShowWithdrawModal(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-title" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span id="withdraw-title" className="modal-title">Withdraw Provider Earnings</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowWithdrawModal(false)}>✕</button>
            </div>

            <form onSubmit={handleConfirmWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Destination Provider */}
              <div className="field">
                <label>Disbursement Rail</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setWithdrawProvider('mtn')}
                    className={`btn btn-sm ${withdrawProvider === 'mtn' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      borderColor: withdrawProvider === 'mtn' ? '#ffcc00' : undefined,
                      color: withdrawProvider === 'mtn' ? '#ffcc00' : undefined,
                    }}
                  >
                    MTN Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawProvider('airtel')}
                    className={`btn btn-sm ${withdrawProvider === 'airtel' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      borderColor: withdrawProvider === 'airtel' ? '#ff5050' : undefined,
                      color: withdrawProvider === 'airtel' ? '#ff5050' : undefined,
                    }}
                  >
                    Airtel Money
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Amount to Withdraw (UGX)</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Available: {formatUgx(unwithdrawn)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={1000}
                  max={unwithdrawn}
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {[0.25, 0.5, 0.75, 1].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setWithdrawAmount(Math.floor(unwithdrawn * pct))}
                    >
                      {pct === 1 ? '100% (Max)' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Phone */}
              <div className="field">
                <label>Recipient Handset (+256...)</label>
                <input
                  type="tel"
                  required
                  value={withdrawPhone}
                  onChange={e => handleWithdrawPhoneChange(e.target.value)}
                  placeholder="+256 770 000000"
                />
              </div>

              {/* Payout Calculation */}
              <div style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Gross Payout</span>
                  <span>{formatUgx(withdrawAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>Transfer Fee</span>
                  <span>{formatUgx(transferFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <span>Net Credited to SIM</span>
                  <span>{formatUgx(netWithdraw)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWithdrawModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingWithdraw}>
                  {submittingWithdraw ? <span style={{ marginRight: 6, display: 'inline-flex' }}><AwsSpinner size={13} variant="inverted" /></span> : null}
                  Confirm & Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export interface UserDashboardProps {
  mode: PortalMode;
  onSwitch: (m: PortalMode) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

/* ─── Main UserDashboard — modern nav ─────────────────────────── */
export const UserDashboard: React.FC<UserDashboardProps> = ({ mode, onSwitch, currentPath, onNavigate }) => {
  const { user, deviceId, deviceName, connections, register, isRegistering } = useApp();

  const getTabFromPath = (path?: string): UserTab => {
    const p = (path || window.location.pathname).replace(/\/+$/, '');
    const seg = p.split('/').pop()?.toLowerCase();
    if (seg && ['hotspots', 'overview', 'wallet', 'settings'].includes(seg)) {
      return seg as UserTab;
    }
    const h = window.location.hash.replace(/^#/, '').toLowerCase();
    if (['hotspots', 'overview', 'wallet', 'settings'].includes(h)) {
      return h as UserTab;
    }
    return 'hotspots';
  };

  const [tab, setTab] = useState<UserTab>(() => getTabFromPath(currentPath));
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync tab with route path
  useEffect(() => {
    const nextTab = getTabFromPath(currentPath);
    setTab(nextTab);
  }, [currentPath]);

  const handleTabChange = (newTab: UserTab) => {
    setTab(newTab);
    const isDashHost = typeof window !== 'undefined' && (
      window.location.hostname.startsWith('dash.') ||
      window.location.hostname.startsWith('app.')
    );
    const targetPath = isDashHost
      ? (newTab === 'hotspots' ? '/' : `/${newTab}`)
      : (newTab === 'hotspots' ? '/app' : `/app/${newTab}`);

    if (onNavigate) {
      onNavigate(targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
    }
    if (window.location.hash) {
      window.history.replaceState({}, '', targetPath);
    }
  };

  const navCounts: Record<UserTab, number | null> = {
    hotspots: null,
    overview: null,
    wallet: null,
    settings: null,
  };

  const toastTimers = React.useRef<Map<string, number>>(new Map());
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimers.current.delete(id);
    }, 4000);
    toastTimers.current.set(id, timer);
  };
  const removeToast = (id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) { clearTimeout(timer); toastTimers.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  React.useEffect(() => () => { toastTimers.current.forEach(t => clearTimeout(t)); }, []);

  const TAB_TITLES: Record<UserTab, string> = {
    hotspots: 'Hotspots & Routers',
    overview: 'Network Overview',
    wallet:   'Wallet & Payouts',
    settings: 'Settings & API Credentials',
  };
  const TAB_SUBS: Record<UserTab, string> = {
    hotspots: 'MikroTik RouterOS v7 & OpenWrt fleet, packages, vouchers, and live revenue',
    overview: 'Your network mesh and gateway status at a glance',
    wallet:   'Mobile Money (MTN & Airtel UGX) collections and instant withdrawals',
    settings: 'Identity, device credential, and API keys',
  };

  const handleRegisterDirect = () => {
    if (!user) {
      onSwitch('auth');
      return;
    }
    const devName = `${user.name || user.username || 'My'}'s Web Client`;
    register(devName, 'web', false).catch((err) => {
      addToast(err instanceof Error ? err.message : 'Failed to register device', 'error');
    });
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="portal">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} aria-hidden />}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Navigation">
        {/* Brand — matches landing: Zoop Internet */}
        <div className="sidebar-brand" onClick={() => onSwitch('landing')} style={{ cursor: 'pointer', gap: 8 }}>
          <div className="sidebar-brand-icon" style={{ width: 32, height: 32, borderRadius: 8, background: '#000', border: '1px solid rgba(8,242,255,0.3)', boxShadow: '0 0 10px rgba(8,242,255,0.15)' }}>
            <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={24} height={24} />
          </div>
          <div className="sidebar-brand-name">Zoop</div>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99, background: 'rgba(8,242,255,0.12)', color: '#38bdf8', border: '1px solid rgba(8,242,255,0.28)' }}>Internet</span>
        </div>

        <WorkspaceSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="User navigation">
          <div className="nav-section-label">Personal</div>
          {NAV.map(item => (
            <button key={item.id} id={`nav-${item.id}`}
              title={TAB_SUBS[item.id]}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => { handleTabChange(item.id); setSidebarOpen(false); }}
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
          {(user?.role === 'admin' || user?.role === 'operator') && (
            <button
              id="sidebar-admin-console-btn"
              onClick={() => onSwitch('admin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 8,
                borderRadius: 8,
                background: 'rgba(245,158,11,0.10)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#f59e0b',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span style={{ flex: 1, textAlign: 'left' }}>Admin Console</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>→</span>
            </button>
          )}
          <div
            className="sidebar-user"
            id="user-profile-area"
            onClick={() => { handleTabChange('settings'); setSidebarOpen(false); }}
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
        <header className="page-header" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen}>
              <Ico d={sidebarOpen ? I.close : I.menu} size={18} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 className="page-title"><span className="page-title-dot" aria-hidden />{TAB_TITLES[tab]}</h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TAB_SUBS[tab]}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em', alignSelf: 'center' }} className="hide-mobile">{deviceName ? `· ${deviceName}` : ''}</span>
          </div>
          <div className="page-header-actions">
            {user && (
              <div className="user-profile-badge hide-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '4px 10px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                <span style={{ fontWeight: 600 }}>{user.username ? `@${user.username}` : user.name}</span>
                {user.role === 'admin' && <span className="badge badge-info" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>ADMIN</span>}
              </div>
            )}
            {!user ? (
              <button className="btn btn-primary btn-sm" id="header-register-btn" onClick={() => onSwitch('auth')}>
                <Ico d={I.plus} />Sign In / Register
              </button>
            ) : !deviceId ? (
              <button className="btn btn-primary btn-sm" id="header-register-btn" onClick={handleRegisterDirect} disabled={isRegistering}>
                {isRegistering ? <AwsSpinner size={13} /> : <><Ico d={I.plus} />Connect Device</>}
              </button>
            ) : (
              <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{connections.filter(c=>c.state==='CONNECTED').length} tunnels</span>
            )}
          </div>
        </header>

        <main id="main-content" className="page-body" tabIndex={-1} aria-labelledby="page-title">
          {tab === 'hotspots' && <HotspotsTab onToast={addToast} />}
          {tab === 'overview' && <OverviewTab onRegister={handleRegisterDirect} onToast={addToast} />}
          {tab === 'wallet'   && <WalletTab onToast={addToast} />}
          {tab === 'settings' && <SettingsTab onSwitch={onSwitch} onToast={addToast} />}
        </main>
        <MobileBottomNav items={NAV.map(n=>({ id:n.id, label:n.label, icon: n.icon }))} activeId={tab} onChange={v=>handleTabChange(v as UserTab)} />
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default UserDashboard;
