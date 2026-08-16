import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';
import { useApp } from '../../context/NetworkContext';

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
  plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
};

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
      <button className="portal-switcher-trigger" id="portal-switch-trigger-org" onClick={() => setOpen(v => !v)}>
        <span className="switcher-dot" style={{ background: PORTAL_COLORS[mode] }} />
        <span className="switcher-domain">{PORTAL_LABELS[mode]}</span>
        <Ico d={I.chevronD} size={12} />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['desktop', 'user', 'org', 'admin'] as PortalMode[]).map(m => (
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
  overview: { title: 'Organization Overview',  subtitle: 'Real-time overview of active organization resources.' },
  members:  { title: 'Members & Roles',        subtitle: 'Manage organization team members and access levels.' },
  devices:  { title: 'Managed Devices',        subtitle: 'All devices registered across the organization fleet.' },
  policies: { title: 'Access Policies',        subtitle: 'Zero-trust egress routing rules for teams and devices.' },
  logs:     { title: 'Audit Logs',             subtitle: 'Signed activity records for organization configuration changes.' },
};

/* ─── Create Org Modal ────────────────────────────────────────── */
const CreateOrgModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { doCreateOrg } = useApp();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await doCreateOrg(name.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Create Organization</span>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner"><Ico d={I.alert} />{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Organization Name</label>
            <input id="org-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp Infrastructure" required autoFocus />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" id="org-create-submit" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
              Create Organization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Add Member Modal ────────────────────────────────────────── */
const AddMemberModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { doAddOrgMember } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await doAddOrgMember(name.trim(), email.trim(), role);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Invite Member to Organization</span>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-banner"><Ico d={I.alert} />{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Full Name</label>
            <input id="member-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Chen" required autoFocus />
          </div>
          <div className="field">
            <label>Email Address</label>
            <input id="member-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="sarah@acme-corp.com" required />
          </div>
          <div className="field">
            <label>Role</label>
            <select id="member-role-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="network_engineer">Network Engineer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" id="member-add-submit" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OrgDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const {
    organizations, currentOrg, orgMembers, selectOrg,
    allDevices, refreshOrganizations, refreshOrgMembers,
  } = useApp();

  const [tab, setTab] = useState<OrgTab>('overview');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  return (
    <div className="portal" role="main">
      <aside className="sidebar" aria-label="Organization navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={28} height={28} />
          </div>
          <div>
            <div className="sidebar-brand-name">Organization <span className="org-badge">Live API</span></div>
            <div className="sidebar-brand-tagline">Fleet Control Plane</div>
          </div>
        </div>

        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        {/* Organization Switcher Dropdown */}
        <div style={{ padding: '4px 10px 8px' }}>
          {organizations.length > 0 ? (
            <select
              id="org-select-dropdown"
              value={currentOrg?.id.toString() ?? ''}
              onChange={e => {
                const found = organizations.find(o => o.id.toString() === e.target.value);
                if (found) selectOrg(found);
              }}
              style={{
                width: '100%', padding: '6px 8px', background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)',
              }}
            >
              {organizations.map(o => (
                <option key={o.id.toString()} value={o.id.toString()}>{o.name}</option>
              ))}
            </select>
          ) : (
            <button
              className="btn btn-secondary btn-xs"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowCreateOrg(true)}
            >
              <Ico d={I.plus} size={12} />Create Org
            </button>
          )}
        </div>

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
              <div className="sidebar-user-name">{currentOrg?.name ?? 'No Organization'}</div>
              <div className="sidebar-user-role">{currentOrg ? `${orgMembers.length} Members` : 'Create one to begin'}</div>
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
            <button className="btn btn-secondary btn-sm" id="create-org-btn" onClick={() => setShowCreateOrg(true)}>
              <Ico d={I.plus} />New Org
            </button>
            {currentOrg && tab === 'members' && (
              <button className="btn btn-primary btn-sm" id="invite-member-btn" onClick={() => setShowAddMember(true)}>
                <Ico d={I.plus} />Invite Member
              </button>
            )}
          </div>
        </header>

        <div className="page-body">
          {!currentOrg && organizations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ color: 'var(--accent-blue)' }}><Ico d={I.home} size={22} /></div>
              <h3>No Organizations Created</h3>
              <p>Create your first Organization on the Zoop Control Plane to manage multi-user fleets.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateOrg(true)} style={{ marginTop: 8 }}>
                <Ico d={I.plus} />Create Organization
              </button>
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <div className="metrics-bar">
                    <div className="metric-item">
                      <div className="metric-label">Active Organization</div>
                      <div className="metric-value" style={{ fontSize: '1.25rem', fontFamily: 'var(--font-sans)' }}>
                        {currentOrg?.name ?? '—'}
                      </div>
                      <div className="metric-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                        ID: {currentOrg?.id.toString().slice(0, 13)}…
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Total Members</div>
                      <div className="metric-value">{orgMembers.length}</div>
                      <div className="metric-sub">Active members</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">System Fleet Devices</div>
                      <div className="metric-value">{allDevices.length}</div>
                      <div className="metric-sub">Registered endpoints</div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-header">
                      <span className="section-title">Organization Details</span>
                      <button className="btn btn-ghost btn-xs" onClick={refreshOrganizations}>Refresh</button>
                    </div>
                    <div className="info-row">
                      <span className="info-key">Name</span>
                      <span className="info-val">{currentOrg?.name}</span>
                      <span />
                    </div>
                    <div className="info-row">
                      <span className="info-key">Organization ID</span>
                      <span className="info-val">{currentOrg?.id.toString()}</span>
                      <button className="btn btn-ghost btn-xs" onClick={() => navigator.clipboard.writeText(currentOrg?.id.toString() ?? '')}>
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              )}

              {tab === 'members' && (
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">Team Roster ({orgMembers.length})</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => refreshOrgMembers()}>Refresh</button>
                  </div>
                  {orgMembers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '36px 24px' }}>
                      <div className="empty-icon"><Ico d={I.users} size={20} /></div>
                      <h3>No members in this organization</h3>
                      <p>Invite your first team member above.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Member Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgMembers.map(m => (
                          <tr key={m.id.toString()}>
                            <td style={{ fontWeight: 600 }}>{m.name}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{m.email}</td>
                            <td><span className="badge badge-neutral">{m.role}</span></td>
                            <td><span className="badge badge-success">{m.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === 'devices' && (
                <div className="section">
                  <div className="section-header">
                    <span className="section-title">System Devices ({allDevices.length})</span>
                  </div>
                  {allDevices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '36px 24px' }}>
                      <div className="empty-icon"><Ico d={I.layers} size={20} /></div>
                      <h3>No devices registered</h3>
                      <p>Registered endpoints will appear here.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Device Name</th>
                          <th>ID</th>
                          <th>Platform</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allDevices.map(d => (
                          <tr key={d.id.toString()}>
                            <td style={{ fontWeight: 600 }}>{d.name || 'Unnamed Device'}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{d.id.toString()}</td>
                            <td>{d.os || d.platform || '—'}</td>
                            <td><span className="badge badge-success">{d.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {(tab === 'policies' || tab === 'logs') && (
                <div className="empty-state" style={{ padding: '48px 24px' }}>
                  <div className="empty-icon"><Ico d={I.globe} size={20} /></div>
                  <h3>No {tab === 'policies' ? 'policies' : 'logs'} configured</h3>
                  <p>As you add nodes and route policies to {currentOrg?.name}, activity history will be recorded here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateOrg && <CreateOrgModal onClose={() => setShowCreateOrg(false)} />}
      {showAddMember  && <AddMemberModal  onClose={() => setShowAddMember(false)} />}
    </div>
  );
};

export default OrgDashboard;
