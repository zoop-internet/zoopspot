import React from 'react';

interface HowItWorksPageProps {
  handleNav: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Simple &amp; Powerful</p>
        <h1>How Zoop connects you directly.</h1>
        <p>
          Traditional VPNs slow you down by routing all your personal traffic through centralized company servers.
          Zoop creates a direct, encrypted tunnel between your own devices.
        </p>
      </div>

      {/* Quick Answer for users and AI search */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', maxWidth: 860, margin: '0 auto 32px' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Direct Sharing at a Glance
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li><strong style={{ color: 'var(--ink)' }}>Direct Device Connections:</strong> Your laptop, phone, and home computer connect straight to each other. Your internet data never routes through third-party company servers.</li>
          <li><strong style={{ color: 'var(--ink)' }}>Automatic Setup:</strong> Works behind home Wi-Fi and mobile data networks automatically. No port forwarding, no router adjustments.</li>
          <li><strong style={{ color: 'var(--ink)' }}>Seamless Roaming:</strong> Walk from home Wi-Fi to mobile 5G mid-call or during downloads without dropping the connection.</li>
          <li><strong style={{ color: 'var(--ink)' }}>True Speed (&lt;1ms added):</strong> Because your traffic takes the shortest physical path, you get the full speed of your internet without VPN slowdowns.</li>
        </ul>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Direct Mesh Architecture &amp; Tunneling</h2>

      <div className="lp-arch-showcase">
        <img
          src="/assets/zoop-mesh-architecture.webp"
          alt="Zoop peer-to-peer mesh architecture diagram showing encrypted tunnels between devices"
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="lp-arch-grid">
        <div className="lp-arch-card">
          <h3>1. Automatic Direct Pairing</h3>
          <p>
            When you connect your laptop to your home computer or phone, Zoop links them directly across the internet.
            Your data takes the fastest possible path without detours.
          </p>
        </div>

        <div className="lp-arch-card">
          <h3>2. 100% Private &amp; Encrypted</h3>
          <p>
            Every piece of data is protected with bank-grade encryption before it ever leaves your device.
            Nobody in the middle—not even your internet provider—can peek into your traffic.
          </p>
        </div>

        <div className="lp-arch-card">
          <h3>3. Seamless Roaming</h3>
          <p>
            Walking out the door? Moving from home Wi-Fi to mobile 5G? Zoop keeps your downloads and calls connected
            in the background with zero drops.
          </p>
        </div>

        <div className="lp-arch-card">
          <h3>4. Share Only What You Choose</h3>
          <p>
            You are in complete control. Choose who can connect, share with family members with one tap, or turn off sharing
            whenever you need.
          </p>
        </div>
      </div>

      {/* Conversion CTA banner */}
      <div className="lp-cta-banner" style={{ marginTop: 48 }}>
        <div className="lp-cta-copy">
          <h2>Ready to test direct tunneling?</h2>
          <p>Experience sub-millisecond local latency with zero centralized hops. Install in 30 seconds.</p>
        </div>
        <div className="lp-cta-actions">
          <a href="/downloads" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
            Get Zoop Free
          </a>
          <a href="/app" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/app'); }}>
            Launch Web Console
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
