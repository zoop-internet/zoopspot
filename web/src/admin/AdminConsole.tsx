import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../types';
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
};

/* ─── Portal Switcher (Cloudflare-style) ──────────────────────────── */
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
              id="dev-switcher-trigger-admin" aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" style={{ background: 'var(--accent-amber)' }} />
        <span className="switcher-domain">{DOMAINS[mode]}</span>
        <I.chevronD />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['user', 'org', 'admin'] as PortalMode[]).map(m => (
            <button key={m} id={`admin-switch-to-${m}`}
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
      { id: 'connections', label: 'Connections', icon: <I.zap /> },
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

const SearchBar: React.FC<{ id: string; placeholder: string }> = ({ id, placeholder }) => (
  <div className="admin-search">
    <I.search />
    <input id={id} type="search" placeholder={placeholder} />
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

/* ─── Tab Screens ─────────────────────────────────────────────────── */

const SERVICES: { name: string; desc: string; status: SvcStatus }[] = [
  { name: 'Control Plane API',   desc: 'Identity · Auth · Discovery · Signaling', status: 'unknown' },
  { name: 'PostgreSQL',          desc: 'Primary data store',                       status: 'unknown' },
  { name: 'Redis',               desc: 'Ephemeral coordination cache',             status: 'unknown' },
  { name: 'WebSocket Signaling', desc: 'Real-time connection coordination',        status: 'unknown' },
  { name: 'Relay Network',       desc: 'Global relay fallback nodes',              status: 'unknown' },
  { name: 'Discovery Service',   desc: 'Endpoint registration & presence',         status: 'unknown' },
];

const OverviewTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Users</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Accounts</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Devices</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Registered</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Connections</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Live P2P</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Relays</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Active nodes</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Security</div>
        <div className="metric-value" style={{ color: 'var(--text-muted)' }}>0</div>
        <div className="metric-sub">Open alerts</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Service Health</span>
        <span className="badge badge-neutral">API disconnected</span>
      </div>
      {SERVICES.map(s => (
        <div key={s.name} className="info-row">
          <span className="info-key">{s.name}</span>
          <span className="info-val" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.desc}</span>
          <span className="info-meta"><StatusBadge s={s.status} /></span>
        </div>
      ))}
    </div>
  </>
);

const OperationsTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">System Uptime</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Open Incidents</div>
        <div className="metric-value" style={{ color: 'var(--text-muted)' }}>0</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Deployments</div>
        <div className="metric-value">—</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Incident Log</span>
        <button className="btn btn-secondary btn-sm" id="ops-incident-btn"><I.plus />New Incident</button>
      </div>
      <EmptyState icon={<I.activity />} title="No active incidents" desc="Platform incidents and scheduled maintenance windows will be tracked here." />
    </div>
  </>
);

const UsageTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">API Requests</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Last 24h</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Data Transferred</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">This month</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Active Users</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">7-day active</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Usage Analytics</span>
        <button className="btn btn-secondary btn-sm" id="usage-export-btn">Export CSV</button>
      </div>
      <EmptyState icon={<I.barChart />} title="No usage telemetry" desc="Per-account API consumption and bandwidth metrics will display here once the telemetry agent connects." />
    </div>
  </>
);

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

const UsersTab: React.FC = () => (
  <>
    <SearchBar id="admin-users-search" placeholder="Search accounts by name, email or ID…" />
    <div className="section">
      <div className="section-header">
        <span className="section-title">Accounts</span>
        <button className="btn btn-secondary btn-sm" id="admin-users-export-btn">Export Accounts</button>
      </div>
      <EmptyState icon={<I.users />} title="No user accounts" desc="Registered users across all organizations will be listed here with options to manage role and status." />
    </div>
  </>
);

const OrgsTab: React.FC = () => (
  <>
    <SearchBar id="admin-orgs-search" placeholder="Search organizations by name or ID…" />
    <div className="section">
      <div className="section-header">
        <span className="section-title">Organizations</span>
        <button className="btn-admin-primary" id="admin-orgs-create-btn"><I.plus />Create Org</button>
      </div>
      <EmptyState icon={<I.building />} title="No organizations" desc="Enterprise team spaces and organization accounts will appear here." />
    </div>
  </>
);

const DevicesTab: React.FC = () => (
  <>
    <SearchBar id="admin-devices-search" placeholder="Search by device name, public key, or owner…" />
    <div className="section">
      <div className="section-header">
        <span className="section-title">Registered Endpoints</span>
      </div>
      <EmptyState icon={<I.monitor />} title="No devices registered" desc="All registered WireGuard endpoints across all accounts will be listed here." />
    </div>
  </>
);

const ConnectionsTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Active Tunnels</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Direct P2P</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Relayed</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Avg Latency</div>
        <div className="metric-value">—</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Live Tunnels</span>
      </div>
      <EmptyState icon={<I.zap />} title="No active tunnels" desc="Real-time WireGuard sessions between Providers and Recipients will appear here." />
    </div>
  </>
);

const NetworkTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Subnets</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">IP Allocated</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Routes</div>
        <div className="metric-value">—</div>
      </div>
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">IPAM & Overlay Routing</span>
        <button className="btn btn-secondary btn-sm" id="network-subnet-btn"><I.plus />Add Subnet</button>
      </div>
      <EmptyState icon={<I.layers />} title="No subnets allocated" desc="Overlay IP pools, WireGuard subnets, and routing table allocations will display here." />
    </div>
  </>
);

const RelaysTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Relay Nodes</div>
        <div className="metric-value">—</div>
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

    <div className="section">
      <div className="section-header">
        <span className="section-title">Relay Nodes</span>
        <button className="btn-admin-primary" id="admin-relays-add-btn"><I.plus />Add Relay Node</button>
      </div>
      <EmptyState icon={<I.globe />} title="No relay nodes configured" desc="Fallback relay nodes (TURN/STUN relays) for nat-traversal fallback are listed here." />
    </div>
  </>
);

const SecurityTab: React.FC = () => (
  <>
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Open Alerts</div>
        <div className="metric-value" style={{ color: 'var(--text-muted)' }}>0</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Revocations</div>
        <div className="metric-value">—</div>
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
      <EmptyState icon={<I.shield />} title="No security events" desc="Authentication anomalies, revocation logs, and authorization failures will appear here." />
    </div>
  </>
);

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

const SystemTab: React.FC = () => (
  <>
    <div className="section">
      <div className="section-header">
        <span className="section-title">Infrastructure Services</span>
        <span className="badge badge-neutral">API disconnected</span>
      </div>
      {SERVICES.map(s => (
        <div key={s.name} className="info-row">
          <span className="info-key">{s.name}</span>
          <span className="info-val" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.desc}</span>
          <span className="info-meta"><StatusBadge s={s.status} /></span>
        </div>
      ))}
    </div>

    <div className="section">
      <div className="section-header">
        <span className="section-title">Control Plane Config</span>
      </div>
      {[
        ['API Endpoint',      'Not configured'],
        ['TLS Certificate',   'Not configured'],
        ['Database URL',      'Not configured'],
        ['Redis URL',         'Not configured'],
        ['WireGuard Subnet',  'Not configured'],
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

/* ─── Screen Registry ─────────────────────────────────────────────── */
const SCREENS: Record<AdminTab, { title: string; subtitle: string; screen: React.ReactNode; action?: React.ReactNode }> = {
  overview:      { title: 'Platform Overview',   subtitle: 'Global platform health, active nodes and service status',  screen: <OverviewTab />, action: <span className="badge badge-neutral">API disconnected</span> },
  operations:    { title: 'Operations',          subtitle: 'Incidents, maintenance and system health',                 screen: <OperationsTab /> },
  usage:         { title: 'Usage Analytics',     subtitle: 'Bandwidth, request volumes and API consumption',          screen: <UsageTab /> },
  billing:       { title: 'Billing',             subtitle: 'Subscriptions, invoices and revenue analytics',           screen: <BillingTab /> },
  users:         { title: 'Users',               subtitle: 'All registered user accounts across the platform',        screen: <UsersTab /> },
  organizations: { title: 'Organizations',       subtitle: 'Enterprise organizations and team spaces',                screen: <OrgsTab />, action: <button className="btn-admin-primary" id="admin-orgs-header-btn"><I.plus />Create Org</button> },
  devices:       { title: 'Devices',             subtitle: 'Registered WireGuard endpoints across all accounts',       screen: <DevicesTab /> },
  connections:   { title: 'Connections',         subtitle: 'Live P2P tunnels and relay connections',                  screen: <ConnectionsTab /> },
  network:       { title: 'Network',             subtitle: 'Overlay IP addressing, subnets and routes',                screen: <NetworkTab /> },
  relays:        { title: 'Relays',              subtitle: 'Fallback relay nodes for NAT-traversal',                  screen: <RelaysTab />, action: <button className="btn-admin-primary" id="admin-relays-header-btn"><I.plus />Add Relay Node</button> },
  security:      { title: 'Security',            subtitle: 'Audit trail, session revocations and threats',            screen: <SecurityTab /> },
  abuse:         { title: 'Abuse',               subtitle: 'Abuse reports, rate limiting and account flags',           screen: <AbuseTab /> },
  system:        { title: 'System',              subtitle: 'Control plane service status and configuration',          screen: <SystemTab /> },
};

/* ─── Main Component ──────────────────────────────────────────────── */
export const AdminConsole: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const cur = SCREENS[tab];

  return (
    <div className="admin-portal" role="main">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={32} height={32} />
          </div>
          <div>
            <div className="admin-brand-name">Zoop</div>
            <div className="admin-brand-sub">Admin Console</div>
          </div>
        </div>

        {/* Cloudflare-style Dev Portal Switcher */}
        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="admin-nav" aria-label="Admin Navigation">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="admin-nav-section">
              <span className="admin-nav-section-label">{section.label}</span>
              <div className="admin-nav-items">
                {section.items.map(item => (
                  <button key={item.id} id={`admin-nav-${item.id}`}
                    className={`admin-nav-item${tab === item.id ? ' active' : ''}`}
                    onClick={() => setTab(item.id)}
                    aria-current={tab === item.id ? 'page' : undefined}>
                    {item.icon}
                    <span className="admin-nav-item-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-operator" id="admin-operator-btn" role="button" tabIndex={0}>
            <div className="admin-operator-avatar"><I.user /></div>
            <div className="admin-operator-info">
              <div className="admin-operator-name">Zoop Operator</div>
              <div className="admin-operator-role">Platform Admin</div>
            </div>
            <I.chevronR />
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{cur.title}</h1>
            <p className="admin-page-subtitle">{cur.subtitle}</p>
          </div>
          {cur.action && <div className="admin-page-actions">{cur.action}</div>}
        </header>

        <div className="admin-page-body" role="region" aria-label={cur.title}>
          {cur.screen}
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;
