import React from 'react';
import type { PortalMode } from '../../types';

interface FooterProps {
  handleNav: (path: string) => void;
  onLaunchConsole: (mode: PortalMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ handleNav, onLaunchConsole }) => {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); handleNav('/'); }} aria-label="ZoopSpot — go to homepage">
              <div className="lp-brand-icon">
                <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="ZoopSpot" width={28} height={28} loading="lazy" />
              </div>
              <span className="lp-brand-text">ZoopSpot</span>
            </a>
            <p>
              Cloud-Managed Wi-Fi Hotspot Billing &amp; Captive Portal — Automated MTN &amp; Airtel Mobile Money checkout, MikroTik RouterOS v7 &amp; OpenWrt integration.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <a href="https://github.com/zoop-internet/zoopspot" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink-secondary)', textDecoration: 'none' }}>★ GitHub — MIT</a>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 999, background: 'rgba(8,242,255,0.08)', border: '1px solid rgba(8,242,255,0.22)', color: '#38bdf8' }}>Mobile Money · WireGuard CGNAT</span>
            </div>
          </div>

          <div className="lp-footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33" onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}>Captive Portal Demo</a></li>
              <li><a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>MikroTik RouterOS v7 Setup</a></li>
              <li><a href="/pricing" onClick={(e) => { e.preventDefault(); handleNav('/pricing'); }}>Pricing &amp; Commissions</a></li>
              <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>API &amp; Documentation</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Operator Console</h4>
            <ul>
              <li><a href="/app/hotspots" rel="nofollow" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>Hotspot Fleet</a></li>
              <li><a href="/app/wallet" rel="nofollow" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>Revenue &amp; Payouts</a></li>
              <li><a href="/auth?tab=signup" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Deploy Free</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Learn More</h4>
            <ul>
              <li><a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>How It Works</a></li>
              <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>Documentation</a></li>
              <li><a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security Architecture</a></li>
              <li><a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>Terms of Service</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Community &amp; Support</h4>
            <ul>
              <li><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub Repository</a></li>
              <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>Documentation Hub</a></li>
              <li><a href="mailto:support@zoopnetwork.app">Support: support@zoopnetwork.app</a></li>
              <li><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Help &amp; Issues</a></li>
              <li><a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Zoop Internet. Open source under MIT License.</span>
          <div className="lp-footer-links">
            <a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>Privacy Policy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>Terms of Service</a>
            <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security</a>
            <a href="mailto:support@zoopnetwork.app">support@zoopnetwork.app</a>
            <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
