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
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  building: <><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
};

const WORKSPACE_LABELS: Record<PortalMode, string> = {
  landing: 'Website & Docs',
  user: 'Personal',
  org: 'Organization',
  admin: 'Platform Admin',
  auth: 'Sign In / Register',
};

const WORKSPACE_COLORS: Record<PortalMode, string> = {
  landing: 'var(--cyan)',
  user: 'var(--accent-green)',
  org: 'var(--accent-blue)',
  admin: 'var(--accent-amber)',
  auth: 'var(--primary)',
};

export const WorkspaceSwitcher: React.FC<Props> = ({ mode, onSwitch }) => {
  const { organizations, currentOrg, selectOrg, doCreateOrg } = useApp();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Keep the trigger label in sync with the active workspace.
  let label = WORKSPACE_LABELS[mode];
  let color = WORKSPACE_COLORS[mode];
  if (mode === 'org' && currentOrg) {
    label = currentOrg.name;
  }

  const goPersonal = () => { onSwitch('user'); setOpen(false); };
  const goOrg = (orgId: string) => {
    const org = organizations.find(o => o.id.toString() === orgId);
    if (org) selectOrg(org);
    onSwitch('org');
    setOpen(false);
  };
  const goAdmin = () => { onSwitch('admin'); setOpen(false); };

  const submitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const org = await doCreateOrg(orgName.trim(), slug.trim() || undefined);
      setOpen(false);
      setCreating(false);
      setOrgName('');
      setSlug('');
      onSwitch('org');
      // selectOrg is handled by NetworkContext.doCreateOrg (sets currentOrg).
      void org;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setBusy(false);
    }
  };

  const orgSelected = mode === 'org' && currentOrg;

  return (
    <div className="portal-switcher" ref={ref}>
      <button className="portal-switcher-trigger" id="portal-switch-trigger" onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="switcher-dot" style={{ background: color }} />
        <span className="switcher-domain">{label}</span>
        <Ico d={I.chevronD} size={12} />
      </button>
      {open && (
        <div className="portal-switcher-menu" role="listbox" style={{ minWidth: 260 }}>
          <div className="ps-section-label">Workspaces</div>

          <button id="switch-to-user" className={`portal-switcher-option${mode === 'user' ? ' ps-selected' : ''}`}
            onClick={goPersonal} role="option" aria-selected={mode === 'user'}>
            {mode === 'user' ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
            <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.user }} />
            Personal
          </button>

          {organizations.map(o => {
            const active = orgSelected && currentOrg.id.toString() === o.id.toString();
            return (
              <button key={o.id.toString()} id={`switch-org-${o.slug || o.id}`}
                className={`portal-switcher-option${active ? ' ps-selected' : ''}`}
                onClick={() => goOrg(o.id.toString())} role="option" aria-selected={!!active}>
                {active ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
                <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.org }} />
                {o.name}
              </button>
            );
          })}

          {creating ? (
            <form className="ps-create-form" onSubmit={submitOrg}>
              <input autoFocus value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name" required />
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32))}
                placeholder="slug (optional, e.g. acme)" />
              {error && <div className="ps-create-error">{error}</div>}
              <div className="ps-create-actions">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setCreating(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-xs" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          ) : (
            <button id="create-org-btn" className="portal-switcher-option" role="option" onClick={() => setCreating(true)}>
              <span className="ps-blank" />
              <span className="switcher-dot" style={{ background: 'transparent', border: '1px dashed currentColor' }} />
              Create organization…
            </button>
          )}

          <div className="ps-divider" />

          <button id="switch-to-admin" className={`portal-switcher-option${mode === 'admin' ? ' ps-selected' : ''}`}
            onClick={goAdmin} role="option" aria-selected={mode === 'admin'}>
            {mode === 'admin' ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
            <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.admin }} />
            {WORKSPACE_LABELS.admin}
          </button>

          <button id="switch-to-landing" className={`portal-switcher-option${mode === 'landing' ? ' ps-selected' : ''}`}
            onClick={() => { onSwitch('landing'); setOpen(false); }} role="option" aria-selected={mode === 'landing'}>
            {mode === 'landing' ? <Ico d={I.check} size={12} /> : <span className="ps-blank" />}
            <span className="switcher-dot" style={{ background: WORKSPACE_COLORS.landing }} />
            Website &amp; Overview
          </button>
        </div>
      )}
    </div>
  );
};