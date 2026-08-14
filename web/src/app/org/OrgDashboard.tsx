import React, { useState, useRef, useEffect } from 'react';
import type { PortalMode } from '../../types';
import { INITIAL_ORG_MEMBERS, INITIAL_ORG_TEAMS, INITIAL_ORG_SUBNETS, INITIAL_AUDIT_LOGS } from '../../api/client';
import './OrgDashboard.css';

/* ─── Icons ───────────────────────────────────────────────────────── */
const Ico: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const I = {
  home:     () => <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>,
  layers:   () => <Ico><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Ico>,
  users:    () => <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  shield:   () => <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ico>,
  network:  () => <Ico><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Ico>,
  fileText: () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Ico>,
  plus:     () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>,
  chevronD: () => <Ico size={13}><polyline points="6 9 12 15 18 9"/></Ico>,
  check:    () => <Ico size={14}><polyline points="20 6 9 17 4 12"/></Ico>,
  user:     () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>,
  chevronR: () => <Ico size={13}><polyline points="9 18 15 12 9 6"/></Ico>,
};

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
              id="dev-switcher-trigger-org" aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" style={{ background: 'var(--accent-blue)' }} />
        <span className="switcher-domain">{DOMAINS[mode]}</span>
        <I.chevronD />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox">
          {(['user', 'org', 'admin'] as PortalMode[]).map(m => (
            <button key={m} id={`org-switch-to-${m}`}
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

type OrgTab = 'overview' | 'subnets' | 'teams' | 'members' | 'audit';

export const OrgDashboard: React.FC<{ mode: PortalMode; onSwitch: (m: PortalMode) => void }> = ({ mode, onSwitch }) => {
  const [tab, setTab] = useState<OrgTab>('overview');
  const [members, setMembers] = useState(INITIAL_ORG_MEMBERS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'network_engineer' | 'admin'>('member');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setMembers(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        devicesCount: 0,
        status: 'invited',
        teams: ['General'],
        lastActive: 'Pending invite acceptance',
      },
    ]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
  };

  return (
    <div className="org-portal" role="main">
      <aside className="org-sidebar" aria-label="Organization navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/zoopicontransparent.png" alt="Zoop" width={32} height={32} />
          </div>
          <div>
            <div className="sidebar-brand-name">Acme Corp <span className="org-badge">Enterprise</span></div>
            <div className="sidebar-brand-tagline">Managed Network Mesh</div>
          </div>
        </div>

        <PortalSwitcher mode={mode} onSwitch={onSwitch} />

        <nav className="sidebar-nav" aria-label="Org navigation">
          <button className={`nav-item${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>
            <I.home /><span className="nav-item-label">Fleet Overview</span>
          </button>
          <button className={`nav-item${tab === 'subnets' ? ' active' : ''}`} onClick={() => setTab('subnets')}>
            <I.network /><span className="nav-item-label">IPAM & Subnets</span>
          </button>
          <button className={`nav-item${tab === 'teams' ? ' active' : ''}`} onClick={() => setTab('teams')}>
            <I.layers /><span className="nav-item-label">Teams & Routing</span>
          </button>
          <button className={`nav-item${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>
            <I.users /><span className="nav-item-label">Members & Access</span>
          </button>
          <button className={`nav-item${tab === 'audit' ? ' active' : ''}`} onClick={() => setTab('audit')}>
            <I.fileText /><span className="nav-item-label">Audit Logs</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar"><I.user /></div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Sarah Chen</div>
              <div className="sidebar-user-role">Lead NetOps • Admin</div>
            </div>
            <I.chevronR />
          </div>
        </div>
      </aside>

      <div className="org-content">
        <header className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">
              {tab === 'overview' && 'Fleet Overview & Telemetry'}
              {tab === 'subnets' && 'IPAM CIDR Allocations (100.64.0.0/10)'}
              {tab === 'teams' && 'Teams & Egress Routing Policies'}
              {tab === 'members' && 'Organization Members & RBAC'}
              {tab === 'audit' && 'Cryptographic Audit Trail'}
            </h1>
            <p className="page-subtitle">
              {tab === 'overview' && 'Real-time telemetry across 57 active endpoints and 3 VPC Transit Gateways.'}
              {tab === 'subnets' && 'Manage virtual Carrier-Grade NAT (CGNAT) subnets and dedicated gateway routers.'}
              {tab === 'teams' && 'Define Zero-Trust access rules mapping developer groups to internal provider nodes.'}
              {tab === 'members' && 'Manage engineers, access levels, and provisioned devices.'}
              {tab === 'audit' && 'Immutable Ed25519-signed logs for all network configuration modifications.'}
            </p>
          </div>
          {tab === 'members' && (
            <div className="page-header-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
                <I.plus />Invite Member
              </button>
            </div>
          )}
        </header>

        <div className="page-body">
          {tab === 'overview' && (
            <>
              <div className="metrics-bar">
                <div className="metric-item">
                  <div className="metric-label">Managed Endpoints</div>
                  <div className="metric-value">57</div>
                  <div className="metric-sub" style={{ color: 'var(--accent-green)' }}>54 online (95%)</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Active Mesh Tunnels</div>
                  <div className="metric-value">128</div>
                  <div className="metric-sub">P2P WireGuard paths</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Network Throughput</div>
                  <div className="metric-value">842 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mbps</span></div>
                  <div className="metric-sub">Current aggregate</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Transit Gateways</div>
                  <div className="metric-value">3</div>
                  <div className="metric-sub">US-East, EU-Central, Lab</div>
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <span className="section-title">Dedicated Gateway Nodes</span>
                </div>
                <div className="org-grid">
                  <div className="org-card">
                    <div className="org-card-header">
                      <div>
                        <div className="org-card-title">AWS US-East Transit Gateway</div>
                        <div className="org-card-meta">100.64.10.1 • VPC Peering</div>
                      </div>
                      <span className="badge badge-success">Online</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      Routes traffic to production Kubernetes clusters and RDS databases.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Egress: Direct P2P</span>
                      <span>14 Active Sessions</span>
                    </div>
                  </div>

                  <div className="org-card">
                    <div className="org-card-header">
                      <div>
                        <div className="org-card-title">Frankfurt DC Edge Router</div>
                        <div className="org-card-meta">100.64.20.1 • Bare Metal Bare</div>
                      </div>
                      <span className="badge badge-success">Online</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      High-throughput EU proxy with dedicated fiber backhaul.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Egress: Direct P2P</span>
                      <span>9 Active Sessions</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'subnets' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Allocated CGNAT Blocks</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {INITIAL_ORG_SUBNETS.map(sub => (
                  <div key={sub.id} className="org-card">
                    <div className="org-card-header">
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>{sub.cidr}</span>
                        <div className="org-card-meta" style={{ marginTop: 2 }}>Gateway: {sub.assignedGateway} • Region: {sub.region}</div>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{sub.allocatedIPs} / {sub.totalIPs} IPs Allocated</span>
                    </div>
                    <div className="ipam-bar">
                      <div className="ipam-fill" style={{ width: `${(sub.allocatedIPs / sub.totalIPs) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'teams' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Zero-Trust Egress Routing Groups</span>
              </div>
              <div className="org-grid">
                {INITIAL_ORG_TEAMS.map(t => (
                  <div key={t.id} className="org-card">
                    <div className="org-card-header">
                      <div>
                        <div className="org-card-title">{t.name}</div>
                        <div className="org-card-meta">{t.memberCount} Members</div>
                      </div>
                      <span className="badge badge-neutral">{t.egressRule}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t.description}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Allowed Providers:</strong>
                      <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                        {t.assignedProviders.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Team Roster ({members.length})</span>
              </div>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Teams</th>
                    <th>Devices</th>
                    <th>Status</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{m.email}</div>
                      </td>
                      <td><span className="badge badge-neutral">{m.role}</span></td>
                      <td>{m.teams.join(', ')}</td>
                      <td>{m.devicesCount} active</td>
                      <td><span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{m.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'audit' && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Cryptographic Audit Trail</span>
              </div>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_AUDIT_LOGS.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(l.timestamp).toLocaleString()}</td>
                      <td style={{ fontWeight: 500 }}>{l.actor}</td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{l.action}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{l.target}</td>
                      <td><span className={`badge ${l.status === 'success' ? 'badge-success' : 'badge-danger'}`}>{l.status}</span></td>
                      <td><span className="audit-sig">{l.signature}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-lg)', padding: 24, width: 440, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Invite Team Member</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                  style={{
                    width: '100%', padding: '8px 12px', background: 'var(--bg-input)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Corporate Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="alex@acme-corp.com"
                  required
                  style={{
                    width: '100%', padding: '8px 12px', background: 'var(--bg-input)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  style={{
                    width: '100%', padding: '8px 12px', background: 'var(--bg-input)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                  }}
                >
                  <option value="member">Member (Read & Connect)</option>
                  <option value="network_engineer">Network Engineer (Route & Policy Config)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgDashboard;
