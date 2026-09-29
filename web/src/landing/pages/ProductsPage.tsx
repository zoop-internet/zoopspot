import React from 'react';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface ProductsPageProps {
  handleNav: (path: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">The ZoopSpot Suite</p>
        <h1>Complete tooling for hotspot operators.</h1>
        <p>
          Everything you need to provision hardware, monetize Wi-Fi bandwidth, and automate mobile money accounting.
        </p>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>
        Hardware &amp; Software Components
      </h2>

      <div className="lp-products-grid">
        {/* Product 1: MikroTik Integration */}
        <div className="lp-product-card">
          <span className="lp-product-badge">Native Hardware</span>
          <h3>MikroTik RouterOS v7 Controller</h3>
          <p>
            Connect any MikroTik router (hEX, hAP, RB series, L009) in 60 seconds with a 1-line script. Uses native RouterOS v7 WireGuard and REST APIs to manage IP bindings without installing third-party firmware.
          </p>
          <ul className="lp-product-features">
            <li><Ico d={Icons.check} size={14} /> Zero extra hardware or custom firmware needed</li>
            <li><Ico d={Icons.check} size={14} /> Automatic walled garden domain whitelisting</li>
            <li><Ico d={Icons.check} size={14} /> Simple queue bandwidth shaping per device</li>
          </ul>
          <div className="lp-product-actions">
            <a href="/docs/installation" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>
              View MikroTik Guide <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
        </div>

        {/* Product 2: OpenWrt Router Client */}
        <div className="lp-product-card">
          <span className="lp-product-badge">Embedded Daemon</span>
          <h3>OpenWrt Client (zoopspot-router)</h3>
          <p>
            A lightweight, battery-safe Go daemon built for OpenWrt 21.02+. Runs on GL.iNet, TP-Link, and custom x86 gateway hardware with sub-15MB RAM footprint and instant session enforcement.
          </p>
          <ul className="lp-product-features">
            <li><Ico d={Icons.check} size={14} /> Pre-compiled MIPS, ARM64, and x86_64 binaries</li>
            <li><Ico d={Icons.check} size={14} /> iptables / nftables captive portal intercept</li>
            <li><Ico d={Icons.check} size={14} /> Local offline token cache resilience</li>
          </ul>
          <div className="lp-product-actions">
            <a href="/downloads" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
              Download Router Package <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
        </div>

        {/* Product 3: Captive Portal Engine */}
        <div className="lp-product-card">
          <span className="lp-product-badge">Guest Portal</span>
          <h3>Mobile-First Captive Portal</h3>
          <p>
            The interface your guests see when connecting to Wi-Fi. Optimized for high conversion, low mobile data footprint, and friction-free payment via MTN MoMo, Airtel Money, or scratch cards.
          </p>
          <ul className="lp-product-features">
            <li><Ico d={Icons.check} size={14} /> Instant automated USSD PIN push (sub-3s)</li>
            <li><Ico d={Icons.check} size={14} /> 10-Minute Emergency Lifeline mode</li>
            <li><Ico d={Icons.check} size={14} /> Custom venue logo and branding themes</li>
          </ul>
          <div className="lp-product-actions">
            <a href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}>
              Test Live Portal Demo <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
        </div>

        {/* Product 4: Operator Dashboard */}
        <div className="lp-product-card">
          <span className="lp-product-badge">Cloud Dashboard</span>
          <h3>Operator Cloud &amp; Accounting</h3>
          <p>
            Central control plane to manage multiple venues, create access passes, generate printable PDF voucher sheets, monitor live traffic, and withdraw Mobile Money earnings.
          </p>
          <ul className="lp-product-features">
            <li><Ico d={Icons.check} size={14} /> Real-time device counts &amp; revenue charts</li>
            <li><Ico d={Icons.check} size={14} /> 1-Click A4 PDF batch voucher generator</li>
            <li><Ico d={Icons.check} size={14} /> Instant Mobile Money wallet cashout</li>
          </ul>
          <div className="lp-product-actions">
            <a href="/app" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/app'); }}>
              Open Operator Console <Ico d={Icons.arrowRight} size={13} />
            </a>
          </div>
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
