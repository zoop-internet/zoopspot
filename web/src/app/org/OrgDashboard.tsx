import React, { useState } from 'react';
import type { PortalMode } from '../../types';
import { useApp } from '../../context/NetworkContext';
import { WorkspaceSwitcher } from '../../components/WorkspaceSwitcher';

/* ─── Icons ──────────────────────────────────────────────────── */
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
  plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  copy:     <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
};

type OrgTab = 'overview' | 'members' | 'devices' | 'policies' | 'logs';

const NAV: { id: OrgTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview',        icon: <Ico d={I.home}     /> },
  { id: 'members',  label: 'Members',          icon: <Ico d={I.users}    /> },
  { id: 'devices',  label: 'Managed devices',  icon: <Ico d={I.layers}   /> },
  { id: 'policies', label: 'Access policies',  icon: <Ico d={I.globe}    /> },
  { id: 'logs',     label: 'Audit logs',       icon: <Ico d={I.fileText} /> },
];

const TAB_TITLES: Record<OrgTab, string> = {
  overview: 'Overview',
  members:  'Members',
  devices:  'Managed devices',
  policies: 'Access policies',
  logs:     'Audit logs',
};

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
          <span className="modal-title">Create organization</span>
          <button className="btn btn-ghost btn-xs" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="error-banner"><Ico d={I.alert} />{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Organization name</label>
            <input id="org-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp Infrastructure" required autoFocus />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" id="org-create-submit" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
              Create organization
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
          <span className="modal-title">Invite member</span>
          <button className="btn btn-ghost btn-xs" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="error-banner"><Ico d={I.alert} />{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Full name</label>
            <input id="member-name-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Chen" required autoFocus />
          </div>
          <div className="field">
            <label>Email address</label>
            <input id="member-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="sarah@acme-corp.com" required />
          </div>
          <div className="field">
            <label>Role</label>
            <select id="member-role-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="network_engineer">Network engineer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" id="member-add-submit" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Ico d={I.plus} />}
              Add member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main OrgDashboard ───────────────────────────────────────── */
export const OrgDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const {
    organizations, currentOrg, orgMembers, selectOrg,
    allDevices, refreshOrganizations, refreshOrgMembers,
  } = useApp();

  const [tab, setTab] = useState<OrgTab>('overview');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const filteredMembers = orgMembers.filter(m =>
    m.name.toLowerCase().includes(memberFilter.toLowerCase()) ||
    m.email.toLowerCase().includes(memberFilter.toLowerCase()) ||
    m.role.toLowerCase().includes(memberFilter.toLowerCase())
  );

  const filteredDevices = allDevices.filter(d =>
    (d.name || '').toLowerCase().includes(deviceFilter.toLowerCase()) ||
    d.id.toString().toLowerCase().includes(deviceFilter.toLowerCase()) ||
    (d.platform || '').toLowerCase().includes(deviceFilter.toLowerCase())
  );

  return (
    <div className="portal" role="main">
      <aside className="sidebar" aria-label="Organization navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={28} height={28} />
          </div>
          <div className="sidebar-brand-name">Zoop</div>
        </div>

        <WorkspaceSwitcher mode={mode} onSwitch={onSwitch} />

        {/* Org selector */}
        {organizations.length > 0 && (
          <div style={{ padding: '4px 10px 8px' }}>
            <select
              id="org-select-dropdown"
              value={currentOrg?.id.toString() ?? ''}
              onChange={e => {
                const found = organizations.find(o => o.id.toString() === e.target.value);
                if (found) selectOrg(found);
              }}
              style={{
                width: '100%', padding: '7px 10px', background: 'var(--bg-input)',
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                color: 'var(--text-primary)', fontSize: '0.8125rem', fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
            >
              {organizations.map(o => (
                <option key={o.id.toString()} value={o.id.toString()}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

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
              <div className="sidebar-user-name">{currentOrg?.name ?? 'No organization'}</div>
              <div className="sidebar-user-role">{currentOrg ? `${orgMembers.length} members` : 'Create one to begin'}</div>
            </div>
            <Ico d={I.chevronR} size={12} />
          </div>
        </div>
      </aside>

      <div className="portal-content">
        <header className="page-header">
          <h1 className="page-title">{TAB_TITLES[tab]}</h1>
          <div className="page-header-actions">
            <button className="btn btn-secondary btn-sm" id="create-org-btn" onClick={() => setShowCreateOrg(true)}>
              <Ico d={I.plus} />New org
            </button>
            {currentOrg && tab === 'members' && (
              <button className="btn btn-primary btn-sm" id="invite-member-btn" onClick={() => setShowAddMember(true)}>
                <Ico d={I.plus} />Invite member
              </button>
            )}
          </div>
        </header>

        <div className="page-body">
          {!currentOrg && organizations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Ico d={I.home} size={22} /></div>
              <h3>No organizations yet</h3>
              <p>Create your first organization to manage multi-user device fleets.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateOrg(true)} style={{ marginTop: 8 }}>
                <Ico d={I.plus} />Create organization
              </button>
            </div>
          ) : (
            <>
              {/* Overview */}
              {tab === 'overview' && (
                <>
                  <div className="metrics-bar">
                    <div className="metric-item">
                      <div className="metric-label">Organization</div>
                      <div className="metric-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                        {currentOrg?.name ?? '—'}
                      </div>
                      <div className="metric-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                        {currentOrg?.id.toString().slice(0, 13)}…
                      </div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Members</div>
                      <div className="metric-value">{orgMembers.length}</div>
                      <div className="metric-sub">Active members</div>
                    </div>
                    <div className="metric-item">
                      <div className="metric-label">Fleet devices</div>
                      <div className="metric-value">{allDevices.length}</div>
                      <div className="metric-sub">Registered endpoints</div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-header">
                      <span className="section-title">Organization details</span>
                      <button className="btn btn-ghost btn-xs" onClick={refreshOrganizations}>Refresh</button>
                    </div>
                    <div className="info-row">
                      <span className="info-key">Name</span>
                      <span className="info-val">{currentOrg?.name}</span>
                      <span />
                    </div>
                    <div className="info-row">
                      <span className="info-key">Organization ID</span>
                      <span className="info-val" style={{ fontSize: '0.75rem' }}>{currentOrg?.id.toString()}</span>
                      <button className="btn btn-ghost btn-xs" onClick={() => {
                        navigator.clipboard.writeText(currentOrg?.id.toString() ?? '');
                        addToast('Organization ID copied');
                      }}>
                        <Ico d={I.copy} size={11} />Copy
                      </button>
                    </div>
                    {currentOrg?.slug && (
                      <div className="info-row">
                        <span className="info-key">Slug</span>
                        <span className="info-val">{currentOrg.slug}</span>
                        <span />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Members */}
              {tab === 'members' && (
                <div className="section">
                  <div className="section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <span className="section-title">Team roster ({orgMembers.length})</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search…"
                        value={memberFilter}
                        onChange={e => setMemberFilter(e.target.value)}
                        style={{
                          padding: '5px 10px', fontSize: '0.8125rem', borderRadius: 'var(--r-md)',
                          border: '1px solid var(--border)', background: 'var(--bg-input)',
                          color: 'var(--text-primary)', outline: 'none', width: 160,
                        }}
                      />
                      <button className="btn btn-ghost btn-xs" onClick={() => refreshOrgMembers()}>Refresh</button>
                    </div>
                  </div>
                  {orgMembers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-icon"><Ico d={I.users} size={20} /></div>
                      <h3>No members yet</h3>
                      <p>Invite your first team member using the button above.</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMembers.map(m => (
                            <tr key={m.id.toString()}>
                              <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span></td>
                              <td
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: 'pointer' }}
                                title="Click to copy email"
                                onClick={() => { navigator.clipboard.writeText(m.email); addToast(`Copied ${m.email}`); }}
                              >
                                {m.email}
                              </td>
                              <td><span className="badge badge-neutral">{m.role}</span></td>
                              <td>
                                <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Devices */}
              {tab === 'devices' && (
                <div className="section">
                  <div className="section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <span className="section-title">System devices ({allDevices.length})</span>
                    <input
                      type="text"
                      placeholder="Search…"
                      value={deviceFilter}
                      onChange={e => setDeviceFilter(e.target.value)}
                      style={{
                        padding: '5px 10px', fontSize: '0.8125rem', borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)', background: 'var(--bg-input)',
                        color: 'var(--text-primary)', outline: 'none', width: 160,
                      }}
                    />
                  </div>
                  {allDevices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 24px' }}>
                      <div className="empty-icon"><Ico d={I.layers} size={20} /></div>
                      <h3>No devices registered</h3>
                      <p>Registered endpoints will appear here.</p>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Device name</th>
                            <th>ID</th>
                            <th>Platform</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDevices.map(d => (
                            <tr key={d.id.toString()}>
                              <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || 'Unnamed device'}</span></td>
                              <td
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', cursor: 'pointer' }}
                                title="Click to copy ID"
                                onClick={() => { navigator.clipboard.writeText(d.id.toString()); addToast('Copied device ID'); }}
                              >
                                {d.id.toString()}
                              </td>
                              <td>{d.os || d.platform || '—'}</td>
                              <td><span className="badge badge-success">{d.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Policies / Logs — coming soon */}
              {(tab === 'policies' || tab === 'logs') && (
                <div className="section">
                  <div className="coming-soon">
                    <Ico d={tab === 'policies' ? I.globe : I.fileText} size={28} />
                    <h3>{tab === 'policies' ? 'Access policies' : 'Audit logs'} — coming soon</h3>
                    <p>
                      {tab === 'policies'
                        ? 'Zero-trust egress routing rules for teams and devices will be configurable here.'
                        : 'Signed activity records for organization configuration changes will appear here.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateOrg && <CreateOrgModal onClose={() => { setShowCreateOrg(false); addToast('Organization updated', 'info'); }} />}
      {showAddMember  && <AddMemberModal  onClose={() => { setShowAddMember(false); addToast('Member roster updated', 'info'); }} />}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default OrgDashboard;
