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
            <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); handleNav('/'); }} aria-label="Zoop Internet — go to homepage">
              <div className="lp-brand-icon">
                <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={28} height={28} loading="lazy" />
              </div>
              <span className="lp-brand-text">Zoop Internet</span>
            </a>
            <p>
              Direct device-to-device mesh — WireGuard® encrypted, NAT-traversal, open-source. Your traffic, your route.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', color: 'var(--ink-secondary)', textDecoration: 'none' }}>★ GitHub — MIT</a>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 999, background: 'rgba(8,242,255,0.08)', border: '1px solid rgba(8,242,255,0.22)', color: '#38bdf8' }}>No tracking · No logs</span>
            </div>
          </div>

          <div className="lp-footer-col">
            <h4>Products</h4>
            <ul>
              <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Zoop for PC &amp; Mac</a></li>
              <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Zoop Mobile App</a></li>
              <li><a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>Downloads Matrix</a></li>
              <li><a href="/pricing" onClick={(e) => { e.preventDefault(); handleNav('/pricing'); }}>Pricing — Free &amp; Teams</a></li>
              <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Home Routers</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Consoles</h4>
            <ul>
              <li><a href="https://dash.zoopnetwork.app/" rel="nofollow" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>Personal Device</a></li>
              <li><a href="https://dash.zoopnetwork.app/org" rel="nofollow" onClick={(e) => { e.preventDefault(); onLaunchConsole('org'); }}>Organization Fleet</a></li>
              <li><a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>Get Zoop Free</a></li>
            </ul>
          </div>

          <div className="lp-footer-col">
            <h4>Learn More</h4>
            <ul>
              <li><a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>How It Works</a></li>
              <li><a href="/blog" onClick={(e) => { e.preventDefault(); handleNav('/blog'); }}>Blog &amp; Stories</a></li>
              <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>Documentation</a></li>
              <li><a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security Architecture</a></li>
              <li><a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>Privacy Policy</a></li>
              <li><a href="/terms" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>Terms of Service (EULA)</a></li>
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
