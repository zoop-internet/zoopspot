import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';

/* Shared icon helper */
const Ico: React.FC<{ d: React.ReactNode; size?: number }> = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

const I = {
  layers:   <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  globe:    <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  home:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  chevronR: <polyline points="9 18 15 12 9 6"/>,
  chevronD: <polyline points="6 9 12 15 18 9"/>,
  check:    <polyline points="20 6 9 17 4 12"/>,
};

const PORTAL_LABELS: Record<PortalMode, string> = {
  user:  'app.zoop.com',
  org:   'app.zoop.com/org',
  admin: 'admin.zoop.com',
};
const PORTAL_COLORS: Record<PortalMode, string> = {
  user: 'var(--accent-green)', org: 'var(--accent-blue)', admin: 'var(--accent-amber)',
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
      <button className="portal-switcher-trigger" id="portal-switch-trigger-org" onClick={() => setOpen(v => !v)}>
        <span className="switcher-dot" style={{ background: PORTAL_COLORS[mode] }} />
        <span className="switcher-domain">{PORTAL_LABELS[mode]}</span>
        <Ico d={I.chevronD} size={12} />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['user', 'org', 'admin'] as PortalMode[]).map(m => (
            <button key={m} id={`org-switch-to-${m}`} className={`portal-switcher-option${mode === m ? ' ps-selected' : ''}`}
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

type OrgTab = 'overview' | 'members' | 'devices' | 'policies' | 'logs';

const NAV: { id: OrgTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview',        icon: <Ico d={I.home}     /> },
  { id: 'members',  label: 'Members',          icon: <Ico d={I.users}    /> },
  { id: 'devices',  label: 'Managed Devices',  icon: <Ico d={I.layers}   /> },
  { id: 'policies', label: 'Access Policies',  icon: <Ico d={I.globe}    /> },
  { id: 'logs',     label: 'Audit Logs',       icon: <Ico d={I.fileText} /> },
];

const TAB_META: Record<OrgTab, { title: string; subtitle: string }> = {
  overview: { title: 'Organization Overview',  subtitle: 'Organization fleet status and summary.' },
  members:  { title: 'Members & Roles',        subtitle: 'Manage organization members and their access levels.' },
  devices:  { title: 'Managed Devices',        subtitle: 'All devices registered under this organization.' },
  policies: { title: 'Access Policies',        subtitle: 'Zero-trust egress routing rules for teams and devices.' },
  logs:     { title: 'Audit Logs',             subtitle: 'Signed activity records for all organization configuration changes.' },
};

const ComingSoon: React.FC<{ tab: OrgTab }> = ({ tab }) => (
  <div className="empty-state">
    <div className="empty-icon" style={{ color: 'var(--accent-blue)' }}><Ico d={I.globe} size={20} /></div>
    <h3>Coming in a future release</h3>
    <p>
      The <strong>{TAB_META[tab].title}</strong> feature requires Organization accounts which are not yet
      available in the Control Plane API.
    </p>
  </div>
);

export const OrgDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [tab, setTab] = useState<OrgTab>('overview');

  return (
    <div className="portal" role="main">
      <aside className="sidebar" aria-label="Organization navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={28} height={28} />
          </div>
          <div>
            <div className="sidebar-brand-name">Organization <span className="org-badge">Beta</span></div>
            <div className="sidebar-brand-tagline">Fleet Management</div>
          </div>
        </div>

        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="Org navigation">
          {NAV.map(item => (
            <button key={item.id} id={`org-nav-${item.id}`}
              className={`nav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar"><Ico d={I.user} size={14} /></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Organization Admin</div>
              <div className="sidebar-user-role">Org features coming soon</div>
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
        </header>
        <div className="page-body">
          <ComingSoon tab={tab} />
        </div>
      </div>
    </div>
  );
};

export default OrgDashboard;
