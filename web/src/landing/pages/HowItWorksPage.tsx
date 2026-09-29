import React from 'react';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface HowItWorksPageProps {
  handleNav: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Architecture &amp; Flow</p>
        <h1>How ZoopSpot automates Wi-Fi billing.</h1>
        <p>
          From guest connection to instant Mobile Money payment and router authorization in under 3 seconds.
          Built natively for MikroTik RouterOS v7 and OpenWrt.
        </p>
      </div>

      {/* Quick Architecture Summary */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', maxWidth: 880, margin: '0 auto 36px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          The ZoopSpot Flow at a Glance
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
          <li><strong style={{ color: 'var(--ink)' }}>1. Seamless Redirection:</strong> When an unauthenticated device joins the Wi-Fi, the router intercepts HTTP traffic and directs them to the ZoopSpot Captive Portal.</li>
          <li><strong style={{ color: 'var(--ink)' }}>2. Walled Garden Security:</strong> Payment API endpoints (MTN MoMo, Airtel Money) and ZoopSpot Cloud domains are pre-whitelisted in the router walled garden so guests can checkout with zero initial data.</li>
          <li><strong style={{ color: 'var(--ink)' }}>3. Instant STK Push:</strong> The guest chooses a package, enters their phone number, and a USSD popup prompts for their PIN. Alternatively, they type an 8-digit physical scratch voucher code.</li>
          <li><strong style={{ color: 'var(--ink)' }}>4. Sub-Second Authorization:</strong> Once the payment webhook confirms the transaction, ZoopSpot Cloud calls the router&apos;s REST API over the secure WireGuard tunnel to bind the MAC address and enforce bandwidth queues.</li>
          <li><strong style={{ color: 'var(--ink)' }}>5. Auto-Expiration &amp; Roaming:</strong> When the time or quota lapses, the IP binding is removed, prompting the user to renew if they wish to stay connected.</li>
        </ul>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>
        Complete Hotspot Lifecycle
      </h2>

      <div className="lp-arch-grid">
        <div className="lp-arch-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 800, fontSize: '0.75rem' }}>Step 1</span>
            <h3 style={{ margin: 0 }}>WireGuard CGNAT Tunnel</h3>
          </div>
          <p>
            Your router creates a persistent, encrypted WireGuard tunnel (<code>100.64.0.0/10</code>) to ZoopSpot Cloud. This allows the cloud controller to push instant IP bindings even behind Starlink, 4G LTE, or strict carrier CGNAT.
          </p>
        </div>

        <div className="lp-arch-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.75rem' }}>Step 2</span>
            <h3 style={{ margin: 0 }}>Automated STK Push</h3>
          </div>
          <p>
            Integration with MTN MoMo and Airtel Money APIs triggers instant SIM-toolkit prompts on user devices. No need for guests to open banking apps, copy merchant codes, or remember complex USSD shortcodes.
          </p>
        </div>

        <div className="lp-arch-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 800, fontSize: '0.75rem' }}>Step 3</span>
            <h3 style={{ margin: 0 }}>RouterOS v7 REST Sync</h3>
          </div>
          <p>
            For MikroTik, ZoopSpot utilizes the native RouterOS v7 REST API (<code>/rest/ip/hotspot/ip-binding</code> and <code>/rest/queue/simple</code>) to authorize MACs with zero custom daemon installations needed on the router.
          </p>
        </div>

        <div className="lp-arch-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 800, fontSize: '0.75rem' }}>Step 4</span>
            <h3 style={{ margin: 0 }}>Vouchers &amp; Emergency Lifeline</h3>
          </div>
          <p>
            Supports cash customers with single-use 8-digit scratch vouchers, plus a 10-minute Emergency Lifeline mode that lets stranded visitors with 0 airtime buy float before their session begins.
          </p>
        </div>
      </div>

      {/* Conversion CTA banner */}
      <div className="lp-cta-banner" style={{ marginTop: 48 }}>
        <div className="lp-cta-copy">
          <h2>Ready to connect your router?</h2>
          <p>Setup takes less than 5 minutes on MikroTik or OpenWrt. Test free today.</p>
        </div>
        <div className="lp-cta-actions">
          <a href="/auth?tab=signup" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
            <Ico d={Icons.arrowRight} size={16} />
            Start ZoopSpot Free
          </a>
          <a href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}>
            <Ico d={Icons.zap} size={16} />
            Try Captive Portal Demo
          </a>
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
