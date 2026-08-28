import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/NetworkContext';
import type { PortalMode } from '../types';

interface Props {
  mode: PortalMode;
  onSwitch: (m: PortalMode) => void;
}

const Ico = ({ d, size = 14 }: { d: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {d}
  </svg>
);

const I = {
  check: <><path d="M20 6L9 17l-5-5" /></>,
  chevronD: <><path d="M6 9l6 6 6-6" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  building: <><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrowUpRight: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
};

const WORKSPACE_LABELS: Record<PortalMode, string> = {
  landing: 'Website',
  user: 'Personal',
  org: 'Organization',
  admin: 'Platform Admin',
  auth: 'Sign In',
};

const WORKSPACE_COLORS: Record<PortalMode, string> = {
  landing: 'var(--cyan)',
  user: '#34d399',
  org: '#38bdf8',
  admin: '#f59e0b',
  auth: 'var(--primary)',
};

export const WorkspaceSwitcher: React.FC<Props> = ({ mode, onSwitch }) => {
  const { organizations, currentOrg, selectOrg } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  let label = WORKSPACE_LABELS[mode];
  let color = WORKSPACE_COLORS[mode];
  if (mode === 'org' && currentOrg) {
    label = currentOrg.name;
    color = WORKSPACE_COLORS.org;
  }

  const goPersonal = () => { onSwitch('user'); setOpen(false); };
  const goOrg = (orgId: string) => {
    const org = organizations.find(o => o.id.toString() === orgId);
    if (org) selectOrg(org);
    onSwitch('org');
    setOpen(false);
  };
  const goCreateOrg = () => {
    setOpen(false);
    onSwitch('org');
    // Let OrgDashboard open the dedicated create screen
    setTimeout(() => window.dispatchEvent(new CustomEvent('zoop:open-create-org')), 80);
  };

  const orgSelected = mode === 'org' && currentOrg;

  return (
    <div className="portal-switcher" ref={ref}>
      <button className="portal-switcher-trigger" id="portal-switch-trigger" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="switcher-domain">{label}</span>
        <Ico d={I.chevronD} size={12} />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox" style={{ minWidth: 300, overflow: 'hidden', borderRadius: 12 }}>
          {mode === 'admin' ? (
            <>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(245,158,11,0.08), transparent)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f59e0b' }}>Platform Administration</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Global controls — not a workspace</div>
              </div>
              <div style={{ padding: '8px' }}>
                <button className="portal-switcher-option ps-selected" style={{ borderRadius: 10, padding: '10px 12px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)' }}>
                  <Ico d={I.check} size={12} />
                  <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.admin, width: 8, height: 8, boxShadow: '0 0 8px #f59e0b' }} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <span style={{ fontWeight: 700, color: '#f7fbff', fontSize: '0.875rem' }}>Platform Admin</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Relays, abuse, all orgs</span>
                  </span>
                </button>

              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Platform view</span>
                <button onClick={() => { setOpen(false); onSwitch('landing'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Back to Website <Ico d={I.arrowUpRight} size={12} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Workspaces</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Personal and team environments</div>
              </div>
              <div style={{ padding: '8px' }}>
                <button id="switch-to-user" className={`portal-switcher-option${mode === 'user' ? ' ps-selected' : ''}`}
                  onClick={goPersonal} role="option" aria-selected={mode === 'user'} style={{ borderRadius: 10, padding: '10px 12px' }}>
                  {mode === 'user' ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
                  <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.user, width: 8, height: 8 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Personal</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Private devices & connections</span>
                  </span>
                </button>
                {organizations.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 12px 4px' }}>
                      Organizations · {organizations.length}
                    </div>
                    {organizations.map(o => {
                      const active = orgSelected && currentOrg.id.toString() === o.id.toString();
                      const initial = o.name.trim().charAt(0).toUpperCase() || 'O';
                      return (
                        <button key={o.id.toString()} id={`switch-org-${o.slug || o.id}`}
                          className={`portal-switcher-option${active ? ' ps-selected' : ''}`}
                          onClick={() => goOrg(o.id.toString())} role="option" aria-selected={!!active} style={{ borderRadius: 10, padding: '10px 12px' }}>
                          {active ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
                          <span style={{ width: 28, height: 28, borderRadius: 8, background: active ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)', border: active ? '1px solid rgba(56,189,248,0.28)' : '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: active ? '#38bdf8' : 'var(--text-secondary)', flexShrink: 0 }}>{initial}</span>
                          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{o.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{o.slug ? `/${o.slug}` : o.id.toString().slice(0, 8)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
                <button id="create-org-btn" className="portal-switcher-option" role="option" onClick={goCreateOrg} style={{ borderRadius: 10, padding: '10px 12px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.18)', marginTop: 6 }}>
                  <span className="ps-blank" />
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8 0%, #34d399 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020904', flexShrink: 0 }}><Ico d={I.plus} size={14} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, color: '#f7fbff', fontSize: '0.875rem' }}>New organization</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Create a team workspace</span>
                  </span>
                </button>
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Need help?</span>
                <button onClick={() => { setOpen(false); window.open('https://github.com/zoop-internet/zoop', '_blank'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Docs <Ico d={I.arrowUpRight} size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
