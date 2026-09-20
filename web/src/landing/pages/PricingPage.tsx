import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface PricingPageProps {
  handleNav: (path: string) => void;
  handleWaitlist: (e: React.FormEvent) => void;
  waitlistEmail: string;
  setWaitlistEmail: (val: string) => void;
  waitlistStatus: 'idle' | 'loading' | 'success' | 'error';
  setWaitlistStatus: (val: 'idle' | 'loading' | 'success' | 'error') => void;
  waitlistMsg: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  handleNav,
  handleWaitlist,
  waitlistEmail,
  setWaitlistEmail,
  waitlistStatus,
  setWaitlistStatus,
  waitlistMsg,
}) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Simple &amp; Transparent</p>
        <h1>Free for personal. $8/seat for teams.</h1>
        <p>Self-host free forever. Founding teams lock $8/seat — no hidden fees, MIT licensed.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 860, margin: '0 auto' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399', margin: 0 }}>Personal — Free Forever</h2>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$0 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ month</span></div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited direct tunnels</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Up to 5 devices</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> WireGuard® + STUN/TURN + roaming</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Community support · self-host</li>
          </ul>
          <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Create Zoop ID — Free <Ico d={Icons.arrowRight} size={14} /></a>
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(8,242,255,0.28)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#38bdf8', color: '#020904' }}>Founding</span>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8', margin: 0 }}>Organizations</h2>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$8 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ seat / mo</span></div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited members + fleet</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Roles, audit logs, IPAM &amp; relay controls</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Priority regions + SLA</li>
          </ul>
          <form onSubmit={handleWaitlist} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Join founding waitlist">
            <label htmlFor="pricing-waitlist" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>Join founding waitlist — lock $8</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="pricing-waitlist"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={waitlistEmail}
                onChange={e => { setWaitlistEmail(e.target.value); setWaitlistStatus('idle'); }}
                required
                aria-label="Email for founding waitlist"
                aria-invalid={waitlistStatus === 'error'}
                aria-describedby={waitlistStatus !== 'idle' ? 'pricing-waitlist-status' : undefined}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${waitlistStatus === 'error' ? 'rgba(248,113,113,0.5)' : 'var(--line)'}`, background: 'rgba(0,0,0,0.35)', color: 'var(--ink)', fontSize: '0.875rem' }}
              />
              <button type="submit" className="lp-btn-primary" disabled={waitlistStatus === 'loading'}>{waitlistStatus === 'loading' ? 'Joining…' : 'Join →'}</button>
            </div>
            {waitlistStatus !== 'idle' && <span id="pricing-waitlist-status" role={waitlistStatus === 'error' ? 'alert' : 'status'} aria-live="polite" style={{ fontSize: '0.75rem', color: waitlistStatus === 'success' ? '#34d399' : '#f87171' }}>{waitlistMsg}</span>}
          </form>
        </div>
      </div>

      {/* FAQ & Guarantees callout */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 24, maxWidth: 860, margin: '36px auto 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>Pricing FAQ &amp; Open-Source Guarantees</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, fontSize: '0.8125rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: 'var(--ink)' }}>Is Personal really free forever?</strong>
            <p style={{ margin: '4px 0 0' }}>Yes. Personal use (up to 5 devices, unlimited direct tunnels) is and will always be free under the MIT open-source license.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>What is the Organizations plan?</strong>
            <p style={{ margin: '4px 0 0' }}>Built for engineering teams and fleets needing centralized management, audit logs, and role-based access control.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>Can I self-host the coordinator?</strong>
            <p style={{ margin: '4px 0 0' }}>Absolutely. Both <code>zoop-cloud</code> and <code>zoopd</code> are open source. You can run your own control plane with Postgres or in-memory storage.</p>
          </div>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.75rem', color: 'var(--muted)' }}>All plans include end-to-end encryption, NAT traversal, MIT license. Questions? <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>Security →</a></p>
      <div style={{ marginTop: 48, textAlign: 'center' }}><a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>← Back to Overview</a></div>
    </div>
  );
};
