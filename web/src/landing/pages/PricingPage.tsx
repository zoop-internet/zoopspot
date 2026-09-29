import React from 'react';
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
        <p className="lp-eyebrow">Fair &amp; Transparent</p>
        <h1>Pricing designed for hotspot operators.</h1>
        <p>Start free on your first router. Scale affordably as your venue or ISP network expands.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto' }}>
        {/* Free Plan */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399', margin: 0 }}>
            Starter Operator — Free
          </h2>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>
            $0 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ month</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Perfect for cafes, salons, and single-venue operators.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> 1 Active Hotspot Router</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Automated MTN &amp; Airtel MoMo STK Push</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited 8-Digit Scratch Vouchers</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> 10-Minute Emergency Lifeline</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Standard 3% MoMo collection fee</li>
          </ul>
          <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
            Start Free <Ico d={Icons.arrowRight} size={14} />
          </a>
        </div>

        {/* Pro Plan */}
        <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(8,242,255,0.28)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#38bdf8', color: '#020904' }}>
            Popular
          </span>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8', margin: 0 }}>
            Pro Operator
          </h2>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>
            $15 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ mo (~UGX 55,000)</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>For growing venues, hostels, and multi-access-point sites.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Up to 10 Active Hotspot Routers</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Custom Captive Portal Branding &amp; Logo</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Bandwidth Rate-Limiting per Package</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> 1-Click A4 PDF Batch Voucher Printer</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Reduced 1.5% MoMo collection fee</li>
          </ul>
          <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
            Upgrade to Pro <Ico d={Icons.arrowRight} size={14} />
          </a>
        </div>

        {/* ISP & Fleet Plan */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa', margin: 0 }}>
            ISP &amp; Enterprise
          </h2>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>
            $49 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ mo (~UGX 180,000)</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>For WISPs, hotel chains, and multi-campus networks.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited Routers &amp; Hotspot Zones</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Dedicated WireGuard CGNAT Gateway</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Multi-Admin Team Accounts &amp; Audit Logs</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Custom SMS Gateway Integration</li>
            <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Lowest 1% MoMo collection fee · 24/7 SLA</li>
          </ul>

          <form onSubmit={handleWaitlist} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Join enterprise pilot">
            <label htmlFor="pricing-waitlist" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>Contact Enterprise Team</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="pricing-waitlist"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="operator@network.com"
                value={waitlistEmail}
                onChange={e => { setWaitlistEmail(e.target.value); setWaitlistStatus('idle'); }}
                required
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${waitlistStatus === 'error' ? 'rgba(248,113,113,0.5)' : 'var(--line)'}`, background: 'rgba(0,0,0,0.35)', color: 'var(--ink)', fontSize: '0.875rem' }}
              />
              <button type="submit" className="lp-btn-secondary" disabled={waitlistStatus === 'loading'}>{waitlistStatus === 'loading' ? 'Sending…' : 'Send →'}</button>
            </div>
            {waitlistStatus !== 'idle' && <span role="status" style={{ fontSize: '0.75rem', color: waitlistStatus === 'success' ? '#34d399' : '#f87171' }}>{waitlistMsg}</span>}
          </form>
        </div>
      </div>

      {/* FAQ & Guarantees callout */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 24, maxWidth: 960, margin: '36px auto 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--ink)' }}>Billing &amp; Payout Guarantees</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, fontSize: '0.8125rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: 'var(--ink)' }}>How do I withdraw earnings?</strong>
            <p style={{ margin: '4px 0 0' }}>You can request automated Mobile Money payouts to your MTN or Airtel line anytime from the Operator Wallet. Withdrawals settle within seconds.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>Are there setup or upfront fees?</strong>
            <p style={{ margin: '4px 0 0' }}>None. You can connect your MikroTik or OpenWrt router on the Starter tier at zero cost. We only deduct a small transaction fee when you successfully collect money.</p>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>Can I self-host ZoopSpot Cloud?</strong>
            <p style={{ margin: '4px 0 0' }}>Yes. The core <code>zoopspot-cloud</code> and <code>zoopspot-router</code> codebases are open source under the MIT license for community self-hosting.</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
