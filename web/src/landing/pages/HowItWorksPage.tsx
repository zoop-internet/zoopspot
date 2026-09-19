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

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
