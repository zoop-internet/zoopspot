import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PortalMode } from '../types';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { adminListOrganizations, adminListOrgMembers, adminListConnections, adminServices, adminUsers, adminNetwork, adminAudit, adminUsage, adminRelays, adminAddRelay, adminRemoveRelay, adminRevokeDevice, adminSuspendDevice, adminRestoreDevice, listDevices, createOrganization } from '../api/client';
import type { ApiConnection, ApiDevice, ApiOrg, ApiOrgMember, ApiServiceHealth, ApiAdminUser, ApiNetworkUsage, ApiAuditEvent, ApiUsage } from '../api/client';
import './AdminConsole.css';

/* ─── Icon Primitives ─────────────────────────────────────────────── */
const Ico: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const I = {
  grid:       () => <Ico><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Ico>,
  activity:   () => <Ico><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Ico>,
  barChart:   () => <Ico><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ico>,
  creditCard: () => <Ico><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>,
  user:       () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  users:      () => <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  building:   () => <Ico><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6h4"/><path d="M18 9h2a2 2 0 0 1 2 2v9h-4"/><line x1="10" y1="6" x2="10.01" y2="6"/><line x1="14" y1="6" x2="14.01" y2="6"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/></Ico>,
  monitor:    () => <Ico><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Ico>,
  zap:        () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>,
  link:       () => <Ico><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></Ico>,
  globe:      () => <Ico><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Ico>,
  server:     () => <Ico><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></Ico>,
  shield:     () => <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ico>,
  alert:      () => <Ico><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ico>,
  cpu:        () => <Ico><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></Ico>,
  database:   () => <Ico><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Ico>,
  layers:     () => <Ico><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Ico>,
  search:     () => <Ico><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>,
  plus:       () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  chevronR:   () => <Ico size={13}><polyline points="9 18 15 12 9 6"/></Ico>,
  chevronD:   () => <Ico size={13}><polyline points="6 9 12 15 18 9"/></Ico>,
  flag:       () => <Ico><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></Ico>,
  check:      () => <Ico size={14}><polyline points="20 6 9 17 4 12"/></Ico>,
  menu:       () => <Ico><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Ico>,
  close:      () => <Ico><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>,
};

/* ─── Navigation Types & Structure ────────────────────────────────── */
type AdminTab =
  | 'overview' | 'operations' | 'usage' | 'billing'
  | 'users' | 'organizations' | 'devices'
  | 'connections' | 'network' | 'relays'
  | 'security' | 'abuse'
  | 'system';

interface NavSection {
  label: string;
  items: { id: AdminTab; label: string; icon: React.ReactNode }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Platform',
    items: [
      { id: 'overview',    label: 'Overview',    icon: <I.grid /> },
      { id: 'operations',  label: 'Operations',  icon: <I.activity /> },
      { id: 'usage',       label: 'Usage',       icon: <I.barChart /> },
      { id: 'billing',     label: 'Billing',     icon: <I.creditCard /> },
    ],
  },
  {
    label: 'Entities',
    items: [
      { id: 'users',         label: 'Users',         icon: <I.users /> },
      { id: 'organizations', label: 'Organizations', icon: <I.building /> },
      { id: 'devices',       label: 'Devices',       icon: <I.monitor /> },
    ],
  },
  {
    label: 'Network',
    items: [
      { id: 'connections', label: 'Connections', icon: <I.link /> },
      { id: 'network',     label: 'Network',     icon: <I.layers /> },
      { id: 'relays',      label: 'Relays',      icon: <I.globe /> },
    ],
  },
  {
    label: 'Safety',
    items: [
      { id: 'security', label: 'Security', icon: <I.shield /> },
      { id: 'abuse',    label: 'Abuse',    icon: <I.flag /> },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { id: 'system', label: 'System', icon: <I.cpu /> },
    ],
  },
];

/* ─── Toast Notification Helper ───────────────────────────────── */
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360
    }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{
          padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface-3)',
          border: `1px solid ${t.type === 'success' ? 'var(--accent-green)' : t.type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
          boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          fontSize: '0.8125rem', color: 'var(--text-primary)', animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>{t.message}</span>
          <button className="btn btn-ghost btn-xs" style={{ padding: '2px 4px', lineHeight: 1 }} onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
};

/* ─── Shared Components ───────────────────────────────────────────── */
type SvcStatus = 'operational' | 'degraded' | 'down' | 'unknown';

const StatusBadge: React.FC<{ s: SvcStatus }> = ({ s }) => {
  const m: Record<SvcStatus, [string, string]> = {
    operational: ['badge-success', 'Operational'],
    degraded:    ['badge-warning', 'Degraded'],
    down:        ['badge-danger',  'Down'],
    unknown:     ['badge-neutral', 'Unknown'],
  };
  const [cls, label] = m[s];
  return <span className={`badge ${cls}`}>{label}</span>;
};

const SearchBar: React.FC<{ id: string; placeholder: string; label: string; value?: string; onChange?: (v: string) => void }> = ({ id, placeholder, label, value, onChange }) => (
  <div className="admin-search">
    <I.search />
    <input
      id={id}
      type="search"
      placeholder={placeholder}
      aria-label={label}
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
    />
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string; children?: React.ReactNode; pad?: string }> =
  ({ icon, title, desc, children, pad = '48px 24px' }) => (
    <div className="empty-state" style={{ padding: pad }}>
      <div className="empty-state-icon" style={{ width: 48, height: 48 }}>{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {children}
    </div>
  );

/* ─── Real API data ──────────────────────────────────────────── */
function useAdminData() {
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [orgs, setOrgs] = useState<ApiOrg[]>([]);
  const [orgMembers, setOrgMembers] = useState<Record<string, ApiOrgMember[]>>({});
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [services, setServices] = useState<Record<string, ApiServiceHealth>>({});
  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [network, setNetwork] = useState<ApiNetworkUsage | null>(null);
  const [audit, setAudit] = useState<ApiAuditEvent[]>([]);
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [relays, setRelays] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);

  const reload = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // Batch 1: core platform data — tolerate partial failures via allSettled
    Promise.allSettled([
      listDevices(), adminListOrganizations(), adminListConnections(), adminServices(),
      adminUsers(), adminNetwork(), adminAudit(), adminUsage(), adminRelays(),
    ])
      .then(async (results) => {
        if (controller.signal.aborted) return;
        const [d, o, c, svc, u, nw, au, us, rl] = results.map(r => r.status === 'fulfilled' ? (r as PromiseFulfilledResult<unknown>).value : null);
        if (results.some(r => r.status === 'rejected') && !hasLoadedRef.current) {
          // surface first error on initial load
          setError('Some platform data failed to load — retrying.');
        }
        setDevices((d as ApiDevice[]) ?? []);
        setOrgs((o as ApiOrg[]) ?? []);
        setConnections((c as ApiConnection[]) ?? []);
        setServices((svc as Record<string, ApiServiceHealth>) ?? {});
        setUsers((u as ApiAdminUser[]) ?? []);
        setNetwork((nw as ApiNetworkUsage) ?? null);
        setAudit((au as ApiAuditEvent[]) ?? []);
        setUsage((us as ApiUsage) ?? null);
        setRelays((rl as unknown[]) ?? []);
        const orgsList = (o as ApiOrg[]) ?? [];
        // Fetch members with concurrency limit 4 to avoid saturating RateLimiter (300/min)
        const memberMap: Record<string, ApiOrgMember[]> = {};
        const limit = 4;
        for (let i = 0; i < orgsList.length; i += limit) {
          const batch = orgsList.slice(i, i + limit);
          await Promise.all(batch.map(async org => {
            if (controller.signal.aborted) return;
            try { memberMap[org.id.toString()] = await adminListOrgMembers(org.id.toString()); }
            catch { memberMap[org.id.toString()] = []; }
          }));
        }
        if (controller.signal.aborted) return;
        setOrgMembers(memberMap);
        setHasLoaded(true);
        hasLoadedRef.current = true;
        setLastUpdated(new Date());
        if (results.every(r => r.status === 'rejected') && !hasLoadedRef.current) {
          setError('Failed to load platform data. Check that the control plane is reachable.');
        }
      })
      .catch(() => {
        if (!hasLoadedRef.current) setError('Failed to load platform data. Check that the control plane is reachable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { devices, orgs, orgMembers, connections, services, users, network, audit, usage, relays, loading, hasLoaded, error, lastUpdated, reload };
}

/* ─── Tab Screens ─────────────────────────────────────────────────── */

const SERVICE_LABELS: Record<string, string> = {
  store: 'Store',
  relays: 'Relay cluster',
  signaling: 'Signaling',
  turn: 'TURN',
};

function timeAgo(d: Date | null): string {
  if (!d) return 'never';
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return d.toLocaleTimeString();
}

/* ─── Overview dashboard helpers ─────────────────────────────────── */

const STATE_META: Record<string, { label: string; color: string }> = {
  CONNECTED:    { label: 'Connected',    color: '#22c55e' },
  REQUESTED:    { label: 'Requested',    color: '#f59e0b' },
  AUTHORIZED:   { label: 'Authorized',   color: '#06b6d4' },
  CONNECTING:   { label: 'Connecting',   color: '#3b82f6' },
  DISCONNECTED: { label: 'Disconnected', color: '#6b7280' },
};
void STATE_META;

const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, value, sub, color, onClick }) => (
  <button className="ov-kpi" onClick={onClick} style={{ '--kpi-accent': color } as React.CSSProperties}>
    <span className="ov-kpi-icon">{icon}</span>
    <span className="ov-kpi-main">
      <span className="ov-kpi-label">{label}</span>
      <span className="ov-kpi-value">{value}</span>
      <span className="ov-kpi-sub">{sub}</span>
    </span>
    <I.chevronR />
  </button>
);

const OverviewTab: React.FC<{ data: ReturnType<typeof useAdminData>; onNavigate: (t: AdminTab) => void }> = ({ data, onNavigate }) => {
  const {
    devices, connections, services, network, usage, relays,
    loading, hasLoaded, error, reload, lastUpdated,
  } = data;

  const stateCounts = useMemo(() => usage?.connections_by_state ?? {}, [usage]);
  // Active = CONNECTED live tunnels; fallback to filtered connections for accuracy
  const activeTunnels = stateCounts['CONNECTED'] ?? connections.filter(c => ['CONNECTED','AUTHORIZED','CONNECTING'].includes(c.state)).length;
  const pendingRequests = stateCounts['REQUESTED'] ?? connections.filter(c => c.state === 'REQUESTED').length;
  const utilization = network?.utilization_pct ?? null;
  const ipamWarn = utilization !== null && utilization > 80;
  const ipamDanger = utilization !== null && utilization > 95;

  const serviceEntries = Object.entries(services);
  const servicesOk = serviceEntries.length > 0 && serviceEntries.every(([, s]) => s.status === 'ok');
  const hasDegraded = serviceEntries.some(([, s]) => s.status !== 'ok');

  const totalConnections = connections.length;

  const platformMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of devices) {
      const key = (d.os || d.platform || 'unknown').toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = devices.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [devices]);

  const relaySummary = useMemo(() => {
    const nodes = relays as Array<{ id?: string; host?: string; region?: string; status?: string }>;
    const total = nodes.length;
    const online = nodes.filter(r => !r.status || !['offline', 'draining', 'unknown'].includes(r.status)).length;
    const regions = [...new Set(nodes.map(r => r.region).filter(Boolean) as string[])].slice(0, 3);
    return { total, online, regions, nodes };
  }, [relays]);

  if (!hasLoaded && loading) {
    return (
      <div className="section">
        <div className="section-header"><span className="section-title">Platform Overview</span></div>
        <div className="admin-loading-row">
          <span className="spinner" />
          <span>Loading platform data…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && !hasLoaded && (
        <div className="error-banner">
          <I.alert />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={reload}>Retry</button>
        </div>
      )}

      {/* Inline alerts — only when attention is needed */}
      {(ipamDanger || hasDegraded) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hasDegraded && (
            <div className="error-banner" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.22)', color: '#fbbf24' }}>
              <I.alert />
              <span style={{ flex: 1 }}><strong>Service attention required</strong> — one or more subsystems is degraded. Check System for details.</span>
              <button className="btn btn-secondary btn-xs" onClick={() => onNavigate('system')}>Open System</button>
            </div>
          )}
          {ipamDanger && (
            <div className="error-banner" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.22)', color: '#f87171' }}>
              <I.layers />
              <span style={{ flex: 1 }}><strong>IPAM critical</strong> — {utilization?.toFixed(1)}% of 100.64.0.0/10 exhausted. Capacity will run out soon.</span>
              <button className="btn btn-secondary btn-xs" onClick={() => onNavigate('network')}>Manage IPAM</button>
            </div>
          )}
          {ipamWarn && !ipamDanger && (
            <div className="error-banner" style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.18)', color: '#fbbf24' }}>
              <I.layers />
              <span style={{ flex: 1 }}>IPAM at {utilization?.toFixed(1)}% — consider planning additional capacity.</span>
              <button className="btn btn-ghost btn-xs" onClick={() => onNavigate('network')}>View</button>
            </div>
          )}
        </div>
      )}

      {/* Service status — compact single row */}
      <div className="section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: servicesOk ? '#22c55e' : hasDegraded ? '#f59e0b' : '#6b7280', boxShadow: servicesOk ? '0 0 0 4px rgba(34,197,94,0.14)' : undefined, flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{servicesOk ? 'All systems operational' : hasDegraded ? 'Degraded service' : 'Checking services…'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· Updated {timeAgo(lastUpdated)}</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={reload} aria-label="Refresh platform data">
            {loading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Refresh'}
          </button>
        </div>
        <div className="service-chips" style={{ padding: '10px 16px' }}>
          {serviceEntries.length === 0 ? (
            <span className="service-chip service-chip-warn"><span className="chip-dot" />No health data</span>
          ) : (
            serviceEntries.map(([name, s]) => {
              const ok = s.status === 'ok';
              const degraded = s.status === 'degraded';
              return (
                <span key={name} className={`service-chip ${ok ? 'service-chip-ok' : degraded ? 'service-chip-warn' : 'service-chip-down'}`}>
                  <span className="chip-dot" />
                  {SERVICE_LABELS[name] ?? name}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* KPIs — 5 cards, modern accent */}
      <div className="ov-kpis">
        <KpiCard color="#38bdf8" icon={<I.monitor />} label="Devices" value={devices.length} sub="registered" onClick={() => onNavigate('devices')} />
        <KpiCard color="#22c55e" icon={<I.zap />} label="Active Tunnels" value={activeTunnels} sub={totalConnections ? `of ${totalConnections}` : 'CONNECTED'} onClick={() => onNavigate('connections')} />
        <KpiCard color="#f59e0b" icon={<I.alert />} label="Pending" value={pendingRequests} sub="awaiting approval" onClick={() => onNavigate('connections')} />
        <KpiCard color="#a3e635" icon={<I.globe />} label="Relays" value={`${relaySummary.online}/${relaySummary.total || 0}`} sub={relaySummary.total ? (relaySummary.regions.join(' · ') || 'global') : 'no relays'} onClick={() => onNavigate('relays')} />
        <KpiCard color={ipamDanger ? '#ef4444' : ipamWarn ? '#f59e0b' : '#22c55e'} icon={<I.layers />} label="IPAM" value={utilization !== null ? `${utilization.toFixed(1)}%` : '—'} sub={`${(network?.subnets_allocated ?? 0).toLocaleString()} /30`} onClick={() => onNavigate('network')} />
      </div>

      {/* Modern two-panel grid — decluttered */}
      <div className="ov-grid" style={{ gap: 14 }}>
        {/* Left: Relays (admin-created) — replaces Tunnel Health */}
        <div className="section ov-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">Relays</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{relaySummary.online}/{relaySummary.total || 0} online {relaySummary.regions.length ? `· ${relaySummary.regions.join(' · ')}` : ''}</span>
            <button className="ov-panel-link" onClick={() => onNavigate('relays')}>Manage <I.chevronR /></button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
            {relaySummary.total === 0 ? (
              <div style={{ padding: '14px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>No relays yet</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Admins create relays for symmetric NAT fallback. Add one in <b>Relays → Add relay</b> (region, host, ports). Once added, tunnels automatically select the lowest-latency relay. Direct STUN hole-punch is used when possible.</div>
                <button className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => onNavigate('relays')}><I.plus /> Add relay</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(relaySummary.nodes as Array<Record<string, any>>).map((r) => {
                  const id = String(r.id ?? '');
                  const region = String(r.region ?? '—');
                  const host = String(r.host ?? '—');
                  const port = r.port ? `:${r.port}` : '';
                  const ws = String(r.websocket_url ?? r.WebSocketURL ?? '');
                  const status = String(r.status ?? 'online');
                  const active = Number(r.active_sessions ?? r.ActiveSessions ?? 0);
                  const cap = Number(r.max_capacity ?? r.MaxCapacity ?? 10000);
                  const stun = r.stun_port ?? r.STUNPort;
                  const turn = r.turn_port ?? r.TURNPort;
                  const pct = cap > 0 ? Math.min(100, Math.round((active / cap) * 100)) : 0;
                  const statusColor = status === 'online' ? '#22c55e' : status === 'draining' ? '#f59e0b' : '#6b7280';
                  const heartbeat = r.last_heartbeat ?? r.LastHeartbeat;
                  return (
                    <div key={id} style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 999, background: 'rgba(56,189,248,0.10)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.18)' }}>{region}</span>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: status === 'online' ? `0 0 0 3px ${statusColor}22` : undefined }} title={status} />
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {host}{port} {ws ? `· ${ws}` : ''} {stun ? `· STUN:${stun}` : ''} {turn ? `· TURN:${turn}` : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct > 85 ? '#ef4444' : pct > 65 ? '#f59e0b' : '#22c55e', borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{active.toLocaleString()}/{cap.toLocaleString()} · {pct}%</span>
                      </div>
                      {heartbeat && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Heartbeat {new Date(String(heartbeat)).toLocaleTimeString()} · <span style={{ color: statusColor, fontWeight: 600 }}>{status}</span></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Network & fleet — compact unified */}
        <div className="section ov-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">Network & Fleet</span>
            <button className="ov-panel-link" onClick={() => onNavigate('network')}>Manage IPAM <I.chevronR /></button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* IPAM gauge */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Overlay IPAM — 100.64.0.0/10</span>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: ipamDanger ? '#ef4444' : ipamWarn ? '#f59e0b' : 'var(--text-primary)' }}>{utilization !== null ? `${utilization.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="ov-bar" style={{ height: 10 }}>
                <div className={`ov-bar-fill ${ipamDanger ? 'danger' : ipamWarn ? 'warn' : 'ok'}`} style={{ width: `${Math.min(100, utilization ?? 0)}%` }} />
              </div>
              <div className="ov-bar-meta" style={{ marginTop: 6 }}>
                <span>{network ? `${network.subnets_allocated.toLocaleString()} allocated` : 'No data'}</span>
                <span>{network ? `${network.capacity.toLocaleString()} capacity` : ''}</span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)' }} />

            {/* Fleet mix — compact */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Fleet by platform</span>
                <button className="ov-panel-link" style={{ padding: '2px 4px' }} onClick={() => onNavigate('devices')}>{devices.length} devices <I.chevronR /></button>
              </div>
              {platformMix.length === 0 ? (
                <span className="section-note">No device data.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {platformMix.map(({ name, pct }) => (
                    <div key={name} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 44px', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--portal-accent)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Subtle helper — directs to dedicated tabs instead of repeating lists */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 0 2px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Need more detail?</span>
        <button className="ov-panel-link" onClick={() => onNavigate('security')}>Audit log <I.chevronR /></button>
        <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>·</span>
        <button className="ov-panel-link" onClick={() => onNavigate('organizations')}>Organizations <I.chevronR /></button>
        <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>·</span>
        <button className="ov-panel-link" onClick={() => onNavigate('users')}>Users <I.chevronR /></button>
      </div>
    </>
  );
};

const OperationsTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Registered Devices</div>
        <div className="metric-value">{data.devices.length}</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Active Connections</div>
        <div className="metric-value">{data.usage?.connections ?? '—'}</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Organizations</div>
        <div className="metric-value">{data.orgs.length}</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Recent Activity</span>
        <button className="btn btn-secondary btn-sm" onClick={data.reload}>
          {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
        </button>
      </div>
      {data.audit.length === 0 ? (
        <EmptyState icon={<I.activity />} title="No activity recorded" desc="Platform incidents and scheduled maintenance windows will be tracked here." />
      ) : (
        <table className="data-table">
          <thead><tr><th>Time</th><th>Action</th><th>Actor</th></tr></thead>
          <tbody>
            {data.audit.slice(0, 25).map(ev => (
              <tr key={ev.id.toString()}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{new Date(ev.timestamp).toLocaleString()}</td>
                <td><span className="badge badge-neutral">{ev.action}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{ev.actor_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </>
);

const UsageTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const u = data.usage;
  return (
    <>
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Devices</div>
          <div className="metric-value">{u ? u.devices : '—'}</div>
          <div className="metric-sub">trusted: {u ? u.trusted_devices : 0}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Connections</div>
          <div className="metric-value">{u ? u.connections : '—'}</div>
          <div className="metric-sub">by state: {u ? Object.entries(u.connections_by_state).map(([k, v]) => `${k}:${v}`).join(', ') : '—'}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Members</div>
          <div className="metric-value">{u ? u.members : '—'}</div>
          <div className="metric-sub">across {u ? u.organizations : 0} orgs</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Usage Analytics</span>
          <button className="btn btn-secondary btn-sm" onClick={data.reload}>
            {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {!u ? (
          <EmptyState icon={<I.barChart />} title="No usage telemetry" desc="Per-account API consumption and bandwidth metrics will display here once the telemetry agent connects." />
        ) : (
          <div style={{ padding: '16px' }}>
            <div className="info-row"><span className="info-key">Shares</span><span className="info-val">{u.shares}</span></div>
            <div className="info-row"><span className="info-key">Organizations</span><span className="info-val">{u.organizations}</span></div>
            <div className="info-row"><span className="info-key">Trusted devices</span><span className="info-val">{u.trusted_devices}</span></div>
          </div>
        )}
      </div>
    </>
  );
};

const BillingTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">MRR</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Paid Accounts</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Overdue</div>
        <div className="metric-value">—</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Billing & Subscriptions</span>
        <button className="btn btn-secondary btn-sm" id="billing-export-btn">Export Invoices</button>
      </div>
      <EmptyState icon={<I.creditCard />} title="No billing records" desc="Subscription history and Stripe / payment gateway transactions will appear here." />
    </div>
  </>
);

const UsersTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data.users;
    return data.users.filter(u => {
      const handle = (u as any).username || (u as any).zoop_id || u.email || '';
      return (u.name || '').toLowerCase().includes(query) ||
      handle.toLowerCase().includes(query) ||
      (u.role || '').toLowerCase().includes(query) ||
      (u.status || '').toLowerCase().includes(query) ||
      u.id.toString().toLowerCase().includes(query);
    });
  }, [q, data.users]);

  return (
    <>
      <SearchBar id="admin-users-search" placeholder="Search by name, Zoop ID, @username, role, status or ID…" label="Search user accounts" value={q} onChange={setQ} />
      <div className="section">
        <div className="section-header">
          <span className="section-title">Accounts {q.trim() ? `(${filtered.length}/${data.users.length})` : `(${data.users.length})`}</span>
          <button className="btn btn-secondary btn-sm" onClick={data.reload}>
            {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {data.users.length === 0 ? (
          <EmptyState icon={<I.users />} title="No user accounts" desc="Registered users across all organizations will be listed here with options to manage role and status." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<I.search />} title="No matching accounts" desc={`No accounts match "${q.trim()}".`} pad="36px 24px" />
        ) : (
          <table className="data-table">
            <caption style={{ captionSide:'top', textAlign:'left', padding:'8px 18px', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>Accounts — search by name, Zoop ID, role or status</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Zoop ID / Username</th><th scope="col">Role</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {filtered.map(u => {
                const handle = (u as any).username ? `@${(u as any).username}` : (u as any).zoop_id || u.email || '—';
                return (
                <tr key={u.id.toString()}>
                  <td style={{ fontWeight: 600 }}>{u.name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{handle}</td>
                  <td><span className="badge badge-neutral">{u.role}</span></td>
                  <td><span className={`badge ${u.status === 'active' || u.status === 'trusted' ? 'badge-success' : 'badge-neutral'}`}>{u.status}</span></td>
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

const OrgsTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data.orgs;
    return data.orgs.filter(o =>
      (o.name || '').toLowerCase().includes(query) ||
      (o.slug || '').toLowerCase().includes(query) ||
      o.id.toString().toLowerCase().includes(query)
    );
  }, [q, data.orgs]);

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createOrganization(name.trim(), slug.trim() || undefined);
      setShowCreate(false);
      setName('');
      setSlug('');
      data.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SearchBar id="admin-orgs-search" placeholder="Search by name, slug or ID…" label="Search organizations" value={q} onChange={setQ} />

      {error && (
        <div className="error-banner">
          <I.alert />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {showCreate && (
        <form className="section" onSubmit={createOrg}>
          <div className="section-header">
            <span className="section-title">Create Organization</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Organization name *
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp"
                style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Slug
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32))} placeholder="acme"
                style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }} />
            </label>
          </div>
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            <button className="btn-admin-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Organization'}</button>
          </div>
        </form>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">Organizations {q.trim() ? `(${filtered.length}/${data.orgs.length})` : `(${data.orgs.length})`}</span>
          <button className="btn-admin-primary" id="admin-orgs-create-btn" onClick={() => setShowCreate(v => !v)}><I.plus />Create Org</button>
        </div>
        {data.orgs.length === 0 ? (
          <EmptyState icon={<I.building />} title="No organizations" desc="Enterprise team spaces and organization accounts will appear here." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<I.search />} title="No matching organizations" desc={`No organizations match "${q.trim()}".`} pad="36px 24px" />
        ) : (
          <table className="data-table">
            <caption style={{ captionSide:'top', textAlign:'left', padding:'8px 18px', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>Organizations — click row for detail</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Slug</th><th scope="col">Organization ID</th><th scope="col">Members</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id.toString()}>
                  <td style={{ fontWeight: 600 }}>{o.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{o.slug ? `/${o.slug}` : '—'}</td>
                  <td>
                    <span title={o.id.toString()} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {o.id.toString().slice(0, 13)}…
                    </span>
                  </td>
                  <td><span className="badge badge-neutral">{data.orgMembers[o.id.toString()]?.length ?? 0}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const DEV_STATUS_BADGE: Record<string, string> = {
  trusted: 'badge-success',
  registered: 'badge-neutral',
  suspended: 'badge-warning',
  revoked: 'badge-danger',
};
const DEV_STATUS_LABEL: Record<string, string> = {
  trusted: 'Trusted',
  registered: 'Registered',
  suspended: 'Suspended',
  revoked: 'Revoked',
};
const devStatusLabel = (s: string) => DEV_STATUS_LABEL[s] ?? (s.charAt(0).toUpperCase() + s.slice(1));

const DevicesTab: React.FC<{ data: ReturnType<typeof useAdminData>; onToast: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ data, onToast }) => {
  const [q, setQ] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data.devices;
    return data.devices.filter(d =>
      (d.name || '').toLowerCase().includes(query) ||
      d.id.toString().toLowerCase().includes(query) ||
      (d.os || '').toLowerCase().includes(query) ||
      (d.status || '').toLowerCase().includes(query)
    );
  }, [q, data.devices]);

  const trusted = data.devices.filter(d => d.status === 'trusted').length;
  const suspended = data.devices.filter(d => d.status === 'suspended').length;
  const revoked = data.devices.filter(d => d.status === 'revoked').length;

  const runAction = async (id: string, action: 'revoke' | 'suspend' | 'restore', label: string) => {
    setBusy(id);
    setError(null);
    try {
      if (action === 'revoke') await adminRevokeDevice(id);
      if (action === 'suspend') await adminSuspendDevice(id);
      if (action === 'restore') await adminRestoreDevice(id);
      setConfirming(null);
      onToast(`Device ${label}d successfully`, 'success');
      data.reload();
    } catch {
      const errMs = `Failed to ${label} device. Check the control plane and try again.`;
      setError(errMs);
      onToast(errMs, 'error');
    } finally {
      setBusy(null);
    }
  };

  const renderAction = (d: ApiDevice) => {
    const id = d.id.toString();
    const isConfirming = confirming === id;
    const isBusy = busy === id;

    if (d.status === 'revoked') return <span className="section-note" style={{ textAlign: 'right' }}>No actions</span>;
    if (d.status === 'suspended') {
      return isConfirming ? (
        <>
          <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => setConfirming(null)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => runAction(id, 'restore', 'restore')} disabled={isBusy}>
            {isBusy ? 'Restoring…' : 'Confirm restore'}
          </button>
        </>
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(id)}>Restore</button>
      );
    }
    return isConfirming ? (
      <>
        <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => setConfirming(null)}>Cancel</button>
        <button className="btn btn-danger btn-sm" style={{ marginRight: 6 }} onClick={() => runAction(id, 'suspend', 'suspend')} disabled={isBusy}>
          {isBusy ? 'Suspending…' : 'Suspend'}
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => runAction(id, 'revoke', 'revoke')} disabled={isBusy}>
          {isBusy ? 'Revoking…' : 'Revoke'}
        </button>
      </>
    ) : (
      <>
        <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => setConfirming(id)}>Suspend</button>
        <button className="btn btn-danger btn-sm btn-outline" onClick={() => setConfirming(id)}>Revoke</button>
      </>
    );
  };

  return (
    <>
      <SearchBar
        id="admin-devices-search"
        placeholder="Search by name, OS, ID or status…"
        label="Search devices"
        value={q}
        onChange={setQ}
      />

      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Registered Endpoints</div>
          <div className="metric-value">{data.devices.length}</div>
          <div className="metric-sub">across all accounts</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Trusted</div>
          <div className="metric-value">{trusted}</div>
          <div className="metric-sub">fully operational</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Suspended</div>
          <div className="metric-value">{suspended}</div>
          <div className="metric-sub">needs attention</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Revoked</div>
          <div className="metric-value">{revoked}</div>
          <div className="metric-sub">access denied</div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <I.alert />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">
            Registered Endpoints {q.trim() ? `(${filtered.length}/${data.devices.length})` : `(${data.devices.length})`}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={data.reload}>
            {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {data.devices.length === 0 ? (
          <EmptyState icon={<I.monitor />} title="No devices registered" desc="All registered WireGuard endpoints across all accounts will be listed here." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<I.search />} title="No matching devices" desc={`No endpoints match "${q.trim()}". Try a different name, OS, ID or status.`} pad="36px 24px" />
        ) : (
          <table className="data-table">
            <caption style={{ captionSide:'top', textAlign:'left', padding:'8px 18px', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>Endpoints — {filtered.length} of {data.devices.length} · Revoke suspends immediately</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Device ID</th><th scope="col">OS</th><th scope="col">Status</th><th scope="col" style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id.toString()}>
                  <td style={{ fontWeight: 600 }}>{d.name || 'Unnamed Device'}</td>
                  <td>
                    <span title={d.id.toString()} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {d.id.toString().slice(0, 13)}…
                    </span>
                  </td>
                  <td>{d.os || '—'}</td>
                  <td><span className={`badge ${DEV_STATUS_BADGE[d.status] ?? 'badge-neutral'}`}>{devStatusLabel(d.status)}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{renderAction(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const ConnectionsTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const active = data.connections.filter(c => c.state === 'CONNECTED').length;
  const pending = data.connections.filter(c => c.state === 'REQUESTED').length;
  return (
    <>
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Active Tunnels</div>
          <div className="metric-value">{active}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Pending Requests</div>
          <div className="metric-value">{pending}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Total</div>
          <div className="metric-value">{data.connections.length}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Live Tunnels</span>
          <button className="btn btn-secondary btn-sm" onClick={data.reload}>
            {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {data.connections.length === 0 ? (
          <EmptyState icon={<I.zap />} title="No connections" desc="WireGuard sessions between Providers and Recipients will appear here." />
        ) : (
          <table className="data-table">
            <caption style={{ captionSide:'top', textAlign:'left', padding:'8px 18px', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>Tunnels — provider → recipient, WireGuard state</caption>
            <thead><tr><th scope="col">Provider</th><th scope="col">Recipient</th><th scope="col">State</th><th scope="col">Provider IP</th><th scope="col">Recipient IP</th></tr></thead>
            <tbody>
              {data.connections.map(c => (
                <tr key={c.id.toString()}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.provider_id?.toString().slice(0, 13)}…</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.recipient_id?.toString().slice(0, 13)}…</td>
                  <td><span className={`badge ${c.state === 'CONNECTED' ? 'badge-success' : c.state === 'REQUESTED' ? 'badge-warning' : 'badge-neutral'}`}>{c.state}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.provider_ip || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{c.recipient_ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const NetworkTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const nw = data.network;
  return (
    <>
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Pool</div>
          <div className="metric-value" style={{ fontSize: '0.9rem' }}>{nw ? nw.pool : '—'}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Subnets Allocated</div>
          <div className="metric-value">{nw ? nw.subnets_allocated : '—'}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Utilization</div>
          <div className="metric-value">{nw ? `${nw.utilization_pct.toFixed(3)}%` : '—'}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">IPAM & Overlay Routing</span>
          <button className="btn btn-secondary btn-sm" onClick={data.reload}>
            {data.loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Refresh'}
          </button>
        </div>
        {!nw ? (
          <EmptyState icon={<I.layers />} title="No subnets allocated" desc="Overlay IP pools, WireGuard subnets, and routing table allocations will display here." />
        ) : (
          <div style={{ padding: '16px' }}>
            <div className="info-row">
              <span className="info-key">CGNAT Pool</span>
              <span className="info-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{nw.pool}</span>
              <span />
            </div>
            <div className="info-row">
              <span className="info-key">Allocated /30 Subnets</span>
              <span className="info-val">{nw.subnets_allocated}</span>
              <span />
            </div>
            <div className="info-row">
              <span className="info-key">Capacity</span>
              <span className="info-val">{nw.capacity.toLocaleString()}</span>
              <span />
            </div>
            <div className="info-row">
              <span className="info-key">Utilization</span>
              <span className="info-val">{nw.utilization_pct.toFixed(3)}%</span>
              <span />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const RelaysTab: React.FC<{ data: ReturnType<typeof useAdminData>; onToast: (msg: string, type?: 'success' | 'error' | 'info') => void }> = ({ data, onToast }) => {
  const relays = data.relays as unknown as { id?: string; region?: string; host?: string; status?: string }[];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ id: '', region: '', host: '', port: '443', websocket_url: '', stun_port: '3478', turn_port: '' });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const addRelay = async () => {
    if (!form.id.trim() || !form.host.trim()) {
      onToast('Relay id and host are required', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminAddRelay({
        id: form.id.trim(),
        region: form.region.trim() || 'global',
        host: form.host.trim(),
        port: parseInt(form.port, 10) || 443,
        websocket_url: form.websocket_url.trim() || undefined,
        stun_port: parseInt(form.stun_port, 10) || undefined,
        turn_port: parseInt(form.turn_port, 10) || undefined,
      });
      setShowAdd(false);
      setForm({ id: '', region: '', host: '', port: '443', websocket_url: '', stun_port: '3478', turn_port: '' });
      onToast('Relay node added successfully', 'success');
      data.reload();
    } catch {
      onToast('Failed to add relay node', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeRelay = async (id: string) => {
    if (!window.confirm(`Remove relay node ${id}?`)) return;
    setRemoving(id);
    try {
      await adminRemoveRelay(id);
      onToast(`Relay node ${id} removed`, 'info');
      data.reload();
    } catch {
      onToast('Failed to remove relay node', 'error');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Relay Nodes</div>
          <div className="metric-value">{relays.length}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Active Sessions</div>
          <div className="metric-value">—</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Global Bandwidth</div>
          <div className="metric-value">—</div>
        </div>
      </div>

      {showAdd && (
        <div className="section" style={{ borderColor: 'var(--border)' }}>
          <div className="section-header">
            <span className="section-title">Add Relay Node</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
          <div className="add-relay-form" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {([['id', 'ID *'], ['region', 'Region'], ['host', 'Host *'], ['port', 'Port'], ['websocket_url', 'WebSocket URL'], ['stun_port', 'STUN Port'], ['turn_port', 'TURN Port']] as const).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {label}
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={key === 'port' ? '443' : key === 'stun_port' ? '3478' : ''}
                  style={{ padding: '8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)' }}
                />
              </label>
            ))}
          </div>
          <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
            <button className="btn-admin-primary" onClick={addRelay} disabled={busy}>{busy ? 'Adding…' : 'Add Relay'}</button>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">Relay Nodes</span>
          <button className="btn-admin-primary" id="admin-relays-add-btn" onClick={() => setShowAdd(s => !s)}><I.plus />Add Relay Node</button>
        </div>
        {relays.length === 0 ? (
          <EmptyState icon={<I.globe />} title="No relay nodes configured" desc="Fallback relay nodes (TURN/STUN relays) for nat-traversal fallback are listed here." />
        ) : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Region</th><th>Host</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {relays.map((rl, i) => (
                <tr key={rl.id ?? `relay-${i}`}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{rl.id || '—'}</td>
                  <td>{rl.region || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{rl.host || '—'}</td>
                  <td><span className={`badge ${rl.status === 'offline' || rl.status === 'draining' ? 'badge-neutral' : 'badge-success'}`}>{rl.status || 'online'}</span></td>
                  <td>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => rl.id && removeRelay(rl.id)}
                      disabled={removing === rl.id}>
                      {removing === rl.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const SecurityTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const events = data.audit;
  const revocations = events.filter(e => e.action.includes('revoke')).length;
  return (
    <>
      <div className="metrics-bar">
        <div className="metric-item">
          <div className="metric-label">Open Alerts</div>
          <div className="metric-value" style={{ color: 'var(--text-muted)' }}>0</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Revocations</div>
          <div className="metric-value">{revocations}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Failed Auth (24h)</div>
          <div className="metric-value">—</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Security & Audit Log</span>
          <button className="btn btn-danger btn-sm" id="admin-revoke-btn"><I.alert />Revoke Session</button>
        </div>
        {events.length === 0 ? (
          <EmptyState icon={<I.shield />} title="No security events" desc="Authentication anomalies, revocation logs, and authorization failures will appear here." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th></tr></thead>
            <tbody>
              {events.slice(0, 50).map(ev => (
                <tr key={ev.id.toString()}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{new Date(ev.timestamp).toLocaleString()}</td>
                  <td><span className="badge badge-neutral">{ev.action}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{ev.actor_id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{ev.target_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

const AbuseTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Abuse Reports</div>
        <div className="metric-value" style={{ color: 'var(--text-muted)' }}>0</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Flagged Accounts</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Active Bans</div>
        <div className="metric-value">—</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Abuse Prevention</span>
      </div>
      <EmptyState icon={<I.flag />} title="No pending abuse reports" desc="Reported traffic violations, automated rate-limit triggers, and account flags will appear here." />
    </div>
  </>
);

const SystemTab: React.FC<{ data: ReturnType<typeof useAdminData> }> = ({ data }) => {
  const svcEntries = Object.entries(data.services);
  return (
    <>
      <div className="section">
        <div className="section-header">
          <span className="section-title">Infrastructure Services</span>
          {Object.values(data.services).some(s => s.status === 'ok')
            ? <span className="badge badge-success">API connected</span>
            : <span className="badge badge-neutral">API disconnected</span>}
        </div>
        {svcEntries.length === 0 ? (
          <EmptyState icon={<I.monitor />} title="No service health data" desc="Service health checks will appear here." />
        ) : (
          svcEntries.map(([name, s]) => (
            <div key={name} className="info-row">
              <span className="info-key">{name}</span>
              <span className="info-val" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {s.details ? JSON.stringify(s.details) : ''}
              </span>
              <span className="info-meta">
                <StatusBadge s={s.status === 'ok' ? 'operational' : s.status === 'degraded' ? 'degraded' : 'down'} />
              </span>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Control Plane Config</span>
        </div>
        {[
          ['API Endpoint',      'configured'],
          ['Auth',              'signed requests (Ed25519)'],
          ['Data Store',        'configured'],
          ['Signaling',         'WebSocket'],
          ['WireGuard Subnet',  '100.64.0.0/10 (CGNAT)'],
        ].map(([k, v]) => (
          <div key={k} className="info-row">
            <span className="info-key">{k}</span>
            <span className="info-val" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{v}</span>
            <span className="info-meta" />
          </div>
        ))}
      </div>
    </>
  );
};

/* ─── Screen Registry ─────────────────────────────────────────────── */
type ScreenDef = { title: string; subtitle: string; render: (data: ReturnType<typeof useAdminData>, navigate: (t: AdminTab) => void, onToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => React.ReactNode; action?: React.ReactNode };

const SCREENS: Record<AdminTab, ScreenDef> = {
  overview:      { title: 'Platform Overview',   subtitle: 'Global platform health, connection states, overlay usage and service status',  render: (d, nav) => <OverviewTab data={d} onNavigate={nav} /> },
  operations:    { title: 'Operations',          subtitle: 'Incidents, maintenance and system health',                 render: d => <OperationsTab data={d} /> },
  usage:         { title: 'Usage Analytics',     subtitle: 'Bandwidth, request volumes and API consumption',          render: d => <UsageTab data={d} /> },
  billing:       { title: 'Billing',             subtitle: 'Subscriptions, invoices and revenue analytics',           render: () => <BillingTab /> },
  users:         { title: 'Users',               subtitle: 'All registered user accounts across the platform',        render: d => <UsersTab data={d} /> },
  organizations: { title: 'Organizations',       subtitle: 'Enterprise organizations and team spaces',                render: d => <OrgsTab data={d} /> },
  devices:       { title: 'Devices',             subtitle: 'Registered WireGuard endpoints across all accounts',       render: (d, _nav, onToast) => <DevicesTab data={d} onToast={onToast} /> },
  connections:   { title: 'Connections',         subtitle: 'Live P2P tunnels and relay connections',                  render: d => <ConnectionsTab data={d} /> },
  network:       { title: 'Network',             subtitle: 'Overlay IP addressing, subnets and routes',                render: d => <NetworkTab data={d} /> },
  relays:        { title: 'Relays',              subtitle: 'Fallback relay nodes for NAT-traversal',                  render: (d, _nav, onToast) => <RelaysTab data={d} onToast={onToast} /> },
  security:      { title: 'Security',            subtitle: 'Audit trail, session revocations and threats',            render: d => <SecurityTab data={d} /> },
  abuse:         { title: 'Abuse',               subtitle: 'Abuse reports, rate limiting and account flags',           render: () => <AbuseTab /> },
  system:        { title: 'System',              subtitle: 'Control plane service status and configuration',          render: d => <SystemTab data={d} /> },
};

/* ─── Main Component ──────────────────────────────────────────────── */
export const AdminConsole: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const data = useAdminData();
  const cur = SCREENS[tab];

  const navCounts: Record<AdminTab, number | null> = {
    overview: null,
    operations: null,
    usage: null,
    billing: null,
    users: data.users.length || null,
    organizations: data.orgs.length || null,
    devices: data.devices.length || null,
    connections: data.connections.length || null,
    network: data.network ? data.network.subnets_allocated : null,
    relays: (data.relays as unknown[]).length || null,
    security: data.audit.length || null,
    abuse: null,
    system: null,
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="admin-portal">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {sidebarOpen && <div className="admin-sidebar-overlay open" onClick={() => setSidebarOpen(false)} aria-hidden />}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="admin-brand" style={{ gap: 10 }}>
          <div className="admin-brand-icon" style={{ width: 36, height: 36, borderRadius: 9, background: '#000', border: '1px solid rgba(8,242,255,0.3)', boxShadow: '0 0 14px rgba(8,242,255,0.2)' }}>
            <img src="/zoopicontransparent.png" alt="Zoop Internet" width={28} height={28} />
          </div>
          <div>
            <div className="admin-brand-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Zoop <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99, background: 'rgba(8,242,255,0.12)', color: '#38bdf8', border: '1px solid rgba(8,242,255,0.28)' }}>Internet</span></div>
            <div className="admin-brand-sub">Admin Console</div>
          </div>
        </div>

        {/* Cloudflare-style Dev Portal Switcher */}
        <WorkspaceSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="admin-nav" aria-label="Admin Navigation">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="admin-nav-section">
              <span className="admin-nav-section-label">{section.label}</span>
              <div className="admin-nav-items">
                {section.items.map(item => (
                  <button key={item.id} id={`admin-nav-${item.id}`}
                    className={`admin-nav-item${tab === item.id ? ' active' : ''}`}
                    onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                    aria-current={tab === item.id ? 'page' : undefined}>
                    {item.icon}
                    <span className="admin-nav-item-label" style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {navCounts[item.id] != null && (
                      <span className="nav-count admin-nav-count">{navCounts[item.id]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-operator" id="admin-operator-btn">
            <div className="admin-operator-avatar"><I.user /></div>
            <div className="admin-operator-info">
              <div className="admin-operator-name">Zoop Operator</div>
              <div className="admin-operator-role">Platform Admin</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-page-header" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen}>
              {sidebarOpen ? <I.close /> : <I.menu />}
            </button>
            <div>
              <h1 className="admin-page-title">{cur.title}</h1>
              <p className="admin-page-subtitle">{cur.subtitle}</p>
            </div>
          </div>
          {cur.action && <div className="admin-page-actions">{cur.action}</div>}
        </header>

        <main id="main-content" className="admin-page-body" tabIndex={-1} aria-label={cur.title}>
          {cur.render(data, setTab, addToast)}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default AdminConsole;
