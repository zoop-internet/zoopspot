import React, { useState } from 'react';
import type { PortalMode } from '../../types';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface OverviewPageProps {
  handleNav: (path: string) => void;
  onLaunchConsole: (mode: PortalMode) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  handleNav,
  onLaunchConsole,
}) => {
  const [activePlanPreview, setActivePlanPreview] = useState<'1hr' | '24hr' | '7day'>('1hr');
  const [mockPhone, setMockPhone] = useState('0772123456');
  const [mockPaid, setMockPaid] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);

  const triggerMockStk = () => {
    setMockLoading(true);
    setTimeout(() => {
      setMockLoading(false);
      setMockPaid(true);
    }, 1200);
  };

  return (
    <>
      {/* ─── Hero Section: 5-Second Value Proposition ─────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 999, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700, marginBottom: 16 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                Next-Gen Wi-Fi Hotspot Billing
              </div>

              <h1 style={{ margin: '0 0 20px' }}>
                <span style={{ color: '#ffffff', display: 'block', marginBottom: 6 }}>Monetize Your Wi-Fi.</span>
                <span className="lp-grad-text">Automated MoMo Billing for MikroTik &amp; OpenWrt.</span>
              </h1>
              <p className="lp-hero-desc" style={{ maxWidth: 540 }}>
                Turn any broadband, fiber, or Starlink connection into a profitable Wi-Fi hotspot in under 5 minutes. Instant MTN &amp; Airtel Mobile Money STK Push payments, branded captive portals, 8-digit physical scratch card vouchers, and sub-second RouterOS v7 synchronization.
              </p>
              <div className="lp-hero-actions">
                <button
                  type="button"
                  className="lp-btn-primary large"
                  onClick={() => onLaunchConsole('user')}
                  aria-label="Start ZoopSpot Free — launch operator console"
                >
                  Start ZoopSpot Free
                  <Ico d={Icons.arrowRight} size={16} />
                </button>
                <a
                  href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33"
                  className="lp-btn-secondary large"
                  onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}
                  aria-label="Experience the live guest captive portal"
                >
                  <Ico d={Icons.zap} size={15} />
                  Try Live Captive Portal
                </a>
              </div>
              <div className="lp-hero-trust-bar" aria-label="Key guarantees">
                <span className="lp-trust-item"><Ico d={Icons.check} size={14} /> MTN &amp; Airtel MoMo STK</span>
                <span className="lp-trust-sep" aria-hidden="true" />
                <span className="lp-trust-item"><Ico d={Icons.server} size={14} /> MikroTik v7 &amp; OpenWrt</span>
                <span className="lp-trust-sep" aria-hidden="true" />
                <span className="lp-trust-item"><Ico d={Icons.shield} size={14} /> Zero Public IP / CGNAT</span>
              </div>
            </div>

            {/* Interactive Live Hotspot Simulator Showcase */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 540, borderRadius: 20, border: '1px solid rgba(8,242,255,0.28)', background: '#070b12', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(8,242,255,0.12)', overflow: 'hidden' }}>
                {/* Router Status Topbar */}
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                    <strong style={{ color: 'var(--ink)' }}>MikroTik RouterOS v7.14</strong>
                    <span style={{ color: 'var(--muted)' }}>· hEX S</span>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', color: '#34d399', fontWeight: 700, fontSize: '0.7rem' }}>
                    WireGuard Tunnel Active
                  </span>
                </div>

                {/* Live Captive Portal Demo Container */}
                <div style={{ padding: 20 }}>
                  <div style={{ background: '#0c1219', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink)' }}>Cafe Neo Wi-Fi Spot</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Select your access package to connect</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(56,189,248,0.2)' }}>
                        Instant MoMo
                      </span>
                    </div>

                    {/* Plan Options Pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => { setActivePlanPreview('1hr'); setMockPaid(false); }}
                        style={{ padding: '8px 6px', borderRadius: 8, border: `1px solid ${activePlanPreview === '1hr' ? '#38bdf8' : 'var(--line)'}`, background: activePlanPreview === '1hr' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer', color: 'inherit' }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>1 Hour</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#38bdf8' }}>UGX 500</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActivePlanPreview('24hr'); setMockPaid(false); }}
                        style={{ padding: '8px 6px', borderRadius: 8, border: `1px solid ${activePlanPreview === '24hr' ? '#38bdf8' : 'var(--line)'}`, background: activePlanPreview === '24hr' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer', color: 'inherit' }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>24 Hours</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#34d399' }}>UGX 2,000</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActivePlanPreview('7day'); setMockPaid(false); }}
                        style={{ padding: '8px 6px', borderRadius: 8, border: `1px solid ${activePlanPreview === '7day' ? '#38bdf8' : 'var(--line)'}`, background: activePlanPreview === '7day' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)', textAlign: 'center', cursor: 'pointer', color: 'inherit' }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>7 Days</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#a78bfa' }}>UGX 10,000</div>
                      </button>
                    </div>

                    {/* Interactive Form Action */}
                    {!mockPaid ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={mockPhone}
                            onChange={(e) => setMockPhone(e.target.value)}
                            placeholder="e.g. 0772 123 456"
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(0,0,0,0.4)', color: 'var(--ink)', fontSize: '0.82rem' }}
                          />
                          <button
                            type="button"
                            onClick={triggerMockStk}
                            disabled={mockLoading}
                            style={{ padding: '8px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8 0%, #34d399 100%)', border: 'none', color: '#020904', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {mockLoading ? 'Sending STK…' : 'Pay & Connect'}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Ico d={Icons.zap} size={11} /> Prompts MTN or Airtel USSD screen directly on phone
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Ico d={Icons.check} size={16} />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>Payment Confirmed · Connected!</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)' }}>Router binding active: <code>/rest/ip/hotspot/ip-binding</code></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMockPaid(false)}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Operator Live Revenue Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Guests</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--ink)', marginTop: 2 }}>38 Users</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today&apos;s Revenue</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399', marginTop: 2 }}>UGX 192,500</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>10-Min Lifeline</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38bdf8', marginTop: 2 }}>Enabled</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metric Strip: Key Operational Numbers ───────────────────── */}
      <section className="lp-metric-strip" aria-label="System Highlights">
        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Activation Speed</span>
          <span className="lp-metric-val">
            &lt; <AnimatedCounter end={3} unit="s" />
          </span>
          <span className="lp-metric-sub">
            <Ico d={Icons.check} size={12} /> Instant USSD MoMo prompt on guest phone
          </span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Router Compatibility</span>
          <span className="lp-metric-val">100%</span>
          <span className="lp-metric-sub">MikroTik RouterOS v7 &amp; OpenWrt</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Uganda Carrier Support</span>
          <span className="lp-metric-val">MTN &amp; Airtel</span>
          <span className="lp-metric-sub">Automated MoMo STK Push &amp; Webhooks</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">CGNAT Traversal</span>
          <span className="lp-metric-val">Zero IP</span>
          <span className="lp-metric-sub">Works behind Starlink &amp; 4G LTE routers</span>
        </div>
      </section>

      {/* ─── Real-World Everyday Operator Scenarios ─────────────────── */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Built for Venues, Hostels, &amp; WISPs</p>
          <h2>Turn your internet bills into daily profit.</h2>
          <p className="lp-subtext">Whether running a single coffee shop or a multi-site campus Wi-Fi network, ZoopSpot automates your captive portal, payments, and client access.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 1080, margin: '0 auto' }}>
          {/* Scenario 1: Cafes, Restaurants & Lounges */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(56,189,248,0.1)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
                  Hospitality &amp; Cafes
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Zero Cash Friction</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Automate guest Wi-Fi billing without disturbing waitstaff.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Guests scan your Wi-Fi QR code or tap the SSID. The captive portal pops up automatically with your venue branding. Guests pick an hourly or daily pass, enter their phone number, approve the MoMo prompt on their phone, and instantly get internet.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> Instant MoMo STK Push · Zero manual Wi-Fi passwords
              </div>
            </div>
          </div>

          {/* Scenario 2: Hostels & Student Communities */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '0.72rem', fontWeight: 700 }}>
                  Hostels &amp; Apartments
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Fair-Use Bandwidth</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                High-density student hotspots with bandwidth rate limiting.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Stop individual users from monopolizing bandwidth with 4K video downloads. Assign precise download and upload speed limits to every package (e.g. 5 Mbps down, 2 Mbps up). Automatically expire sessions when the duration lapses.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> Strict rate limiting · Auto MAC binding expiration
              </div>
            </div>
          </div>

          {/* Scenario 3: Physical Scratch Cards & Kiosks */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700 }}>
                  Retail &amp; Kiosks
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cash Sales Ready</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Printable 8-digit scratch vouchers for cash customers.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Not everyone wants to pay with phone wallets. Generate batches of 50, 100, or 500 unique scratch cards in 1 click. Export directly to print-ready A4 PDFs and sell them through local reception desks or neighborhood shops.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> 1-Click A4 PDF batch export · Single-use secure tokens
              </div>
            </div>
          </div>

          {/* Scenario 4: 10-Minute Emergency Lifeline */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700 }}>
                  Guest Empathy
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Zero Airtime Savior</span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                10-Minute Emergency Lifeline for stranded visitors.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Guests arriving with zero airtime or depleted mobile data cannot load their banking app. With ZoopSpot Lifeline, they tap one button to get 10 minutes of rate-limited access to load money or send a message. MAC-locked to 1 claim per 24 hours.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> 10-minute countdown · Anti-abuse MAC rate-limiting
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works: 3-Step Setup ─────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Setup in 5 Minutes</p>
          <h2>How ZoopSpot connects your hardware.</h2>
          <p className="lp-subtext">No external servers or complex RADIUS configurations required. Run on your existing equipment.</p>
        </div>

        <div className="lp-steps-grid">
          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.terminal} size={22} /></div>
              <span className="lp-step-num">01</span>
            </div>
            <h3>1. Provision Your Router</h3>
            <p>Paste our 1-line script into your MikroTik RouterOS Terminal or install <code>zoopspot-router</code> on OpenWrt. It securely connects to ZoopSpot Cloud over WireGuard.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
              <span className="lp-step-num">02</span>
            </div>
            <h3>2. Configure Packages &amp; Pricing</h3>
            <p>Define your access packages in UGX (e.g. 500 UGX for 1 hour, 2,000 UGX for 24 hours), configure bandwidth caps, and brand your captive portal.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.check} size={22} /></div>
              <span className="lp-step-num">03</span>
            </div>
            <h3>3. Collect Automated Revenue</h3>
            <p>Guests connect, choose their package, and pay via MTN/Airtel MoMo STK Push or vouchers. Funds settle into your wallet for instant payout to your phone.</p>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table: ZoopSpot vs Traditional Alternatives ─── */}
      <section className="lp-section" aria-labelledby="compare-heading" style={{ paddingTop: 0 }}>
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Why Operators Choose ZoopSpot</p>
          <h2 id="compare-heading">Modern Hotspot Billing vs Legacy Systems.</h2>
          <p className="lp-subtext">Designed specifically for African ISP &amp; Wi-Fi operators running on Mobile Money.</p>
        </div>
        <div className="lp-scroll-hint">← Swipe horizontally to compare all features →</div>
        <div className="lp-compare-wrap">
          <div className="lp-table-container">
            <table className="lp-table">
              <thead>
                <tr>
                  <th scope="col" className="lp-col-feature">Feature</th>
                  <th scope="col" className="lp-col-zoop">
                    <span className="lp-badge-zoop">Automated</span>
                    <div>ZoopSpot</div>
                  </th>
                  <th scope="col" className="lp-col-competitor">Traditional RADIUS</th>
                  <th scope="col" className="lp-col-competitor">Manual Hotspot Logins</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Payment Method</th>
                  <td className="lp-cell-zoop">Automated MTN &amp; Airtel MoMo STK Push + Vouchers</td>
                  <td className="lp-cell-competitor">Credit card / Stripe only (no MoMo)</td>
                  <td className="lp-cell-competitor">Manual cash to cashier</td>
                </tr>
                <tr>
                  <th scope="row">Router Integration</th>
                  <td className="lp-cell-zoop">1-Click MikroTik RouterOS v7 script &amp; OpenWrt package</td>
                  <td className="lp-cell-competitor">Requires complex FreeRADIUS setup &amp; SQL server</td>
                  <td className="lp-cell-competitor">Default generic login pages</td>
                </tr>
                <tr>
                  <th scope="row">CGNAT &amp; Starlink Safe</th>
                  <td className="lp-cell-zoop">Yes — Encrypted WireGuard overlay, zero public IP</td>
                  <td className="lp-cell-competitor">No — Fails without static public IP</td>
                  <td className="lp-cell-competitor">Local router only</td>
                </tr>
                <tr>
                  <th scope="row">Guest Onboarding Experience</th>
                  <td className="lp-cell-zoop">Fast mobile-first captive portal, sub-3s PIN prompt</td>
                  <td className="lp-cell-competitor">Clunky username/password text fields</td>
                  <td className="lp-cell-competitor">Vulnerable to credential sharing</td>
                </tr>
                <tr>
                  <th scope="row">Emergency Lifeline Mode</th>
                  <td className="lp-cell-zoop">10-Minute emergency data to load MoMo float</td>
                  <td className="lp-cell-competitor">None — guests stranded with no access</td>
                  <td className="lp-cell-competitor">None</td>
                </tr>
                <tr>
                  <th scope="row">Physical Voucher Printing</th>
                  <td className="lp-cell-zoop">1-Click A4 PDF batch export with custom branding</td>
                  <td className="lp-cell-competitor">Manual CSV exports and third-party tools</td>
                  <td className="lp-cell-competitor">Handwritten slips</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="lp-table-footer-note">
            ZoopSpot securely synchronizes router status through WireGuard and authenticated REST controller webhooks. All guest traffic flows directly through your internet connection — ZoopSpot never inspects or proxies user payloads.
          </div>
        </div>
      </section>

      {/* ─── Testimonials from Active Hotspot Operators ───────────────── */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Real Operator Stories</p>
          <h2>Trusted by Wi-Fi operators across Uganda.</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>Verified hotspot operators in Kampala, Jinja, Gulu, and Entebbe.</p>
        </div>

        <div className="lp-testimonials-grid">
          <div className="lp-test-card">
            <div className="lp-test-stars" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Ico key={i} d={Icons.star} size={14} />
              ))}
            </div>
            <p className="lp-test-quote">
              &quot;Switching our cafe to ZoopSpot doubled our Wi-Fi revenue in Ntinda. Guests pay 500 UGX right from their phone without calling a waiter for a password.&quot;
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#38bdf8', color: '#020904' }}>C</div>
              <div>
                <div className="lp-test-name">Cafe Operator · Ntinda, Kampala</div>
                <div className="lp-test-role">MikroTik hEX S · 45 daily active users</div>
              </div>
            </div>
          </div>

          <div className="lp-test-card">
            <div className="lp-test-stars" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Ico key={i} d={Icons.star} size={14} />
              ))}
            </div>
            <p className="lp-test-quote">
              &quot;Our Starlink connection had strict CGNAT, so traditional cloud RADIUS failed. ZoopSpot&apos;s WireGuard tunnel solved it instantly with zero public IP needed.&quot;
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#34d399', color: '#020904' }}>W</div>
              <div>
                <div className="lp-test-name">WISP Operator · Jinja Hub</div>
                <div className="lp-test-role">MikroTik L009 · Starlink + 4G Backup</div>
              </div>
            </div>
          </div>

          <div className="lp-test-card">
            <div className="lp-test-stars" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Ico key={i} d={Icons.star} size={14} />
              ))}
            </div>
            <p className="lp-test-quote">
              &quot;The batch voucher printer is amazing. We print 200 scratch cards at a time and distribute them to local grocery shops next to the student hostel.&quot;
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#a3e635', color: '#0a0e14' }}>H</div>
              <div>
                <div className="lp-test-name">Hostel Network Admin · Gulu</div>
                <div className="lp-test-role">OpenWrt Dual-Band Router Fleet</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Call to Action Banner ──────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-cta-banner">
          <div className="lp-cta-copy">
            <h2>Ready to turn your Wi-Fi into an automated revenue engine?</h2>
            <p>Connect your MikroTik or OpenWrt router today. Get started free in 5 minutes.</p>
          </div>
          <div className="lp-cta-actions">
            <a href="/auth?tab=signup" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
              <Ico d={Icons.arrowRight} size={18} />
              Start ZoopSpot Free
            </a>
            <a href="/portal?hotspot=demo&mac=AA:BB:CC:11:22:33" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/portal?hotspot=demo&mac=AA:BB:CC:11:22:33'); }}>
              <Ico d={Icons.zap} size={18} />
              Try Captive Portal Demo
            </a>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar + FAQ: Operator Answers ─────────────────────── */}
      <section className="lp-trust-bar" aria-label="Trusted technology">
        <div className="lp-trust-inner">
          <span className="lp-trust-label">Compatible with proven network hardware &amp; carriers</span>
          <div className="lp-trust-badges">
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#34d399' }} aria-hidden />MikroTik RouterOS v7.12+</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#38bdf8' }} aria-hidden />OpenWrt 21.02+</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#a3e635' }} aria-hidden />MTN Mobile Money STK</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#f59e0b' }} aria-hidden />Airtel Money STK</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#60a5fa' }} aria-hidden />WireGuard CGNAT Overlay</span>
          </div>
        </div>
      </section>

      <section className="lp-section lp-faq" aria-labelledby="faq-heading">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Hotspot Operator FAQ</p>
          <h2 id="faq-heading">Frequently asked questions.</h2>
          <p className="lp-subtext">Everything you need to know about setting up ZoopSpot on your network.</p>
        </div>
        <div className="lp-faq-grid">
          {[
            {
              q: 'What is ZoopSpot?',
              a: 'ZoopSpot is a Wi-Fi hotspot billing and captive portal platform built for MikroTik and OpenWrt routers. It automates payments via MTN and Airtel Mobile Money STK Push, manages physical scratch card vouchers, and controls client internet access in real time.',
            },
            {
              q: 'Do I need a public static IP address for my router?',
              a: 'No. Traditional RADIUS systems require public IP addresses or complex port forwarding. ZoopSpot uses an automated WireGuard overlay tunnel, allowing your router to connect to ZoopSpot Cloud even behind carrier CGNAT, Starlink, or 4G LTE routers.',
            },
            {
              q: 'Which routers and firmware are supported?',
              a: 'ZoopSpot natively supports MikroTik RouterOS v7.12 or newer (via native RouterOS v7 REST API and WireGuard) as well as any router running OpenWrt 21.02 or newer (using the lightweight zoopspot-router daemon).',
            },
            {
              q: 'How do Mobile Money payments work for guests?',
              a: 'When a guest connects to your Wi-Fi, the captive portal opens automatically. They select an access package (e.g. UGX 500 for 1 hour), enter their MTN or Airtel number, and an automated USSD prompt pops up on their phone requesting their MoMo PIN. Upon approval, their MAC address is activated on your router within 2 seconds.',
            },
            {
              q: 'How do I receive my earnings?',
              a: 'All guest payments in UGX are credited to your ZoopSpot Operator Wallet. You can trigger on-demand payouts directly to your registered MTN Mobile Money or Airtel Money phone number anytime.',
            },
            {
              q: 'What is the 10-Minute Emergency Lifeline?',
              a: 'When arriving visitors have zero mobile data or airtime, they cannot load Mobile Money apps to buy a pass. The Lifeline button provides 10 minutes of rate-limited internet so they can load float or message a friend. To prevent abuse, each device MAC is limited to 1 lifeline per 24 hours.',
            },
            {
              q: 'Can I sell physical vouchers for cash customers?',
              a: 'Yes. The ZoopSpot Operator Dashboard allows you to generate batches of 8-digit scratch vouchers and export them to print-ready A4 PDF sheets with barcodes and QR codes to sell at local shops or reception desks.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="lp-faq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is ZoopSpot?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'ZoopSpot is a Wi-Fi hotspot billing and captive portal platform for MikroTik and OpenWrt routers with automated Mobile Money and voucher billing.',
                },
              },
              {
                '@type': 'Question',
                name: 'Do I need a public static IP address?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. ZoopSpot uses an automated WireGuard overlay tunnel that penetrates CGNAT, Starlink, and 4G LTE connections.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do guests pay with Mobile Money?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Guests select a package on the captive portal and receive an automated MTN or Airtel MoMo STK USSD prompt on their phone to enter their PIN.',
                },
              },
            ],
          }),
        }}
      />
    </>
  );
};
