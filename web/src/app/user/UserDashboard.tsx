import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';
import './UserDashboard.css';

/* ─── Icons ───────────────────────────────────────────────────────── */
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
  building: () => <Ico><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6h4"/><path d="M18 9h2a2 2 0 0 1 2 2v9h-4"/><line x1="10" y1="6" x2="10.01" y2="6"/><line x1="14" y1="6" x2="14.01" y2="6"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/></Ico>,
  wifiOff:  () => <Ico><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></Ico>,
  wifi:     () => <Ico><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></Ico>,
  plus:     () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  user:     () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  logOut:   () => <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico>,
  chevronR: () => <Ico size={13}><polyline points="9 18 15 12 9 6"/></Ico>,
  chevronD: () => <Ico size={13}><polyline points="6 9 12 15 18 9"/></Ico>,
  check:    () => <Ico size={14}><polyline points="20 6 9 17 4 12"/></Ico>,
};

/* ─── Portal Switcher (Cloudflare-style) ──────────────────────────── */
const DOMAINS: Record<PortalMode, string> = { user: 'app.zoop.com', admin: 'admin.zoop.com' };

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
          {(['user', 'admin'] as PortalMode[]).map(m => (
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

/* ─── Nav config ──────────────────────────────────────────────────── */
type UserTab = 'overview' | 'devices' | 'connections' | 'sharing' | 'organization' | 'settings';

const NAV: { id: UserTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',      icon: <I.home /> },
  { id: 'devices',      label: 'Devices',        icon: <I.monitor /> },
  { id: 'connections',  label: 'Connections',    icon: <I.zap /> },
  { id: 'sharing',      label: 'Sharing',        icon: <I.share /> },
  { id: 'organization', label: 'Organization',   icon: <I.building /> },
  { id: 'settings',     label: 'Settings',       icon: <I.settings /> },
];

/* ─── Tab screens ─────────────────────────────────────────────────── */

const OverviewTab: React.FC = () => (
  <>
    {/* Connection status */}
    <div className="section">
      <div className="status-row">
        <div className="status-row-left">
          <div className="status-icon-wrap"><I.wifiOff /></div>
          <div>
            <div className="status-primary-text">
              <span className="status-dot offline" />
              Not Connected
            </div>
            <div className="status-sub-text">Connect to a Provider to route your traffic through Zoop</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" id="overview-connect-btn"><I.plus />Get Started</button>
      </div>
    </div>

    {/* Metrics bar — no boxes */}
    <div className="metrics-bar">
      <div className="metric-item">
        <div className="metric-label">Devices</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Not registered</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Active Tunnels</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">Not connected</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Data Used</div>
        <div className="metric-value">—</div>
        <div className="metric-sub">This session</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Provider</div>
        <div className="metric-value" style={{ fontSize: '1rem', letterSpacing: 0 }}>Off</div>
        <div className="metric-sub">Not sharing</div>
      </div>
    </div>

    {/* Activity */}
    <div className="section">
      <div className="section-header">
        <span className="section-title">Recent Activity</span>
      </div>
      <div className="empty-state" style={{ padding: '44px 24px' }}>
        <div className="empty-state-icon"><I.wifi /></div>
        <h3>No activity yet</h3>
        <p>Connection events and tunnel history will appear here once you start using Zoop.</p>
      </div>
    </div>
  </>
);

const DevicesTab: React.FC = () => (
  <>
    <div className="section">
      <div className="section-header">
        <span className="section-title">Registered Devices</span>
        <button className="btn btn-primary btn-sm" id="devices-add-btn"><I.plus />Register Device</button>
      </div>
      <div className="empty-state" style={{ padding: '52px 24px' }}>
        <div className="empty-state-icon" style={{ width: 48, height: 48 }}><I.monitor /></div>
        <h3>No devices registered</h3>
        <p>Each device gets a unique identity and a secure WireGuard key pair managed by Zoop.</p>
        <button className="btn btn-primary btn-sm" id="devices-empty-btn" style={{ marginTop: 8 }}>
          <I.plus />Register your first device
        </button>
      </div>
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
        <div className="metric-label">Avg Latency</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Data In</div>
        <div className="metric-value">—</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Data Out</div>
        <div className="metric-value">—</div>
      </div>
    </div>
    <div className="section">
      <div className="section-header">
        <span className="section-title">Tunnels</span>
        <button className="btn btn-secondary btn-sm" id="connections-browse-btn">Browse Providers</button>
      </div>
      <div className="empty-state" style={{ padding: '52px 24px' }}>
        <div className="empty-state-icon" style={{ width: 48, height: 48 }}><I.zap /></div>
        <h3>No active connections</h3>
        <p>When you connect to a Provider, your WireGuard tunnel appears here with real-time throughput stats.</p>
      </div>
    </div>
  </>
);

const SharingTab: React.FC = () => {
  const [on, setOn] = useState(false);
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Provider Mode</h3>
          <p>Share your internet connection with authorized Recipients</p>
        </div>
        <div className="toggle-row">
          <div className="toggle-info">
            <h4>{on ? 'You are sharing your connection' : 'Provider mode is off'}</h4>
            <p>{on
              ? 'Authorized Recipients can route their traffic through your device.'
              : 'Enable to share your internet connection with trusted Recipients.'}
            </p>
          </div>
          <label className="toggle" aria-label="Toggle provider mode">
            <input id="sharing-toggle" type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Authorized Recipients</span>
          <button className="btn btn-secondary btn-sm" id="sharing-add-btn" disabled={!on}><I.plus />Add Recipient</button>
        </div>
        <div className="empty-state" style={{ padding: '40px 24px' }}>
          <div className="empty-state-icon"><I.users /></div>
          <h3>No recipients authorized</h3>
          <p>Enable Provider mode then authorize Recipients to start sharing your connection.</p>
        </div>
      </div>
    </>
  );
};

const OrganizationTab: React.FC = () => (
  <>
    <div className="section">
      <div className="section-header">
        <span className="section-title">Membership</span>
      </div>
      <div className="empty-state" style={{ padding: '52px 24px' }}>
        <div className="empty-state-icon" style={{ width: 48, height: 48 }}><I.building /></div>
        <h3>No organization</h3>
        <p>Join or create an organization to manage team devices, share access policies, and control member permissions.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary btn-sm" id="org-create-btn"><I.plus />Create Org</button>
          <button className="btn btn-secondary btn-sm" id="org-join-btn">Join with invite</button>
        </div>
      </div>
    </div>
  </>
);

const SettingsTab: React.FC = () => (
  <>
    <div className="settings-section">
      <div className="settings-section-header">
        <h3>Account</h3>
        <p>Your Zoop identity and authentication</p>
      </div>
      <div className="info-row">
        <span className="info-key">Display name</span>
        <span className="info-val">—</span>
        <button className="btn btn-ghost btn-xs" id="settings-name-btn">Edit</button>
      </div>
      <div className="info-row">
        <span className="info-key">Email</span>
        <span className="info-val">—</span>
        <button className="btn btn-ghost btn-xs" id="settings-email-btn">Edit</button>
      </div>
      <div className="info-row">
        <span className="info-key">Account ID</span>
        <span className="info-val" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
        <span className="info-meta" />
      </div>
    </div>

    <div className="settings-section">
      <div className="settings-section-header">
        <h3>Security</h3>
        <p>Sessions and authentication keys</p>
      </div>
      <div className="info-row">
        <span className="info-key">Auth method</span>
        <span className="info-val">—</span>
        <span className="info-meta" />
      </div>
      <div className="info-row">
        <span className="info-key">Active sessions</span>
        <span className="info-val">—</span>
        <button className="btn btn-danger btn-xs" id="settings-revoke-btn">Revoke all</button>
      </div>
    </div>

    <div>
      <button className="btn btn-ghost" id="settings-logout-btn" style={{ color: 'var(--accent-red)' }}>
        <I.logOut />Sign out
      </button>
    </div>
  </>
);

/* ─── Screen registry ─────────────────────────────────────────────── */
const SCREENS: Record<UserTab, { title: string; subtitle: string; screen: React.ReactNode; action?: React.ReactNode }> = {
  overview:     { title: 'Overview',      subtitle: 'Connection status and recent activity',    screen: <OverviewTab /> },
  devices:      { title: 'Devices',       subtitle: 'Manage your registered Zoop endpoints',    screen: <DevicesTab />,
                  action: <button className="btn btn-primary btn-sm" id="devices-header-btn"><I.plus />Register Device</button> },
  connections:  { title: 'Connections',   subtitle: 'Active tunnels and throughput',            screen: <ConnectionsTab /> },
  sharing:      { title: 'Sharing',       subtitle: 'Share your internet connection as a Provider', screen: <SharingTab /> },
  organization: { title: 'Organization',  subtitle: 'Team memberships and shared policies',     screen: <OrganizationTab /> },
  settings:     { title: 'Settings',      subtitle: 'Account, security and preferences',        screen: <SettingsTab /> },
};

/* ─── Main ────────────────────────────────────────────────────────── */
export const UserDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [tab, setTab] = useState<UserTab>('overview');
  const cur = SCREENS[tab];

  return (
    <div className="user-portal" role="main">
      <aside className="user-sidebar" aria-label="User navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicon.png" alt="Zoop" width={32} height={32} />
          </div>
          <div>
            <div className="sidebar-brand-name">Zoop</div>
            <div className="sidebar-brand-tagline">Direct Connectivity</div>
          </div>
        </div>

        {/* Dev-only portal switcher */}
        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="Navigation">
          {NAV.map(item => (
            <button key={item.id} id={`user-nav-${item.id}`}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}>
              {item.icon}
              <span className="nav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" id="user-profile-btn" role="button" tabIndex={0}>
            <div className="sidebar-avatar"><I.user /></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">My Account</div>
              <div className="sidebar-user-role">Personal</div>
            </div>
            <I.chevronR />
          </div>
        </div>
      </aside>

      <div className="user-content">
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{cur.title}</h1>
            <p className="page-subtitle">{cur.subtitle}</p>
          </div>
          {cur.action && <div className="page-header-actions">{cur.action}</div>}
        </header>

        <div className="page-body" role="region" aria-label={cur.title}>
          {cur.screen}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
