import React from 'react';
import type { PortalMode } from '../../types';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface OverviewPageProps {
  handleNav: (path: string) => void;
  isAuthenticated: boolean;
  onLaunchConsole: (mode: PortalMode) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  handleNav,
  isAuthenticated,
  onLaunchConsole,
}) => {
  return (
    <>
      {/* Hero Section — 5s value prop */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-grid">
            <div>
              <h1 style={{ margin: '0 0 20px' }}>
                <span style={{ color: '#ffffff', display: 'block', marginBottom: 6 }}>Share your internet.</span>
                <span className="lp-grad-text">Direct. Fast. Truly private.</span>
              </h1>
              <p className="lp-hero-desc" style={{ maxWidth: 520 }}>
                Lend your home broadband or mobile data to your laptop, friends, or family directly between devices. Zero middleman bottlenecks, no complex router configurations, and no subscription fees. Ready in 30 seconds.
              </p>
              <div className="lp-hero-actions">
                {isAuthenticated ? (
                  <>
                    <a href="/app" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>
                      Open Web Console
                      <Ico d={Icons.arrowRight} size={16} />
                    </a>
                    <a href="/downloads" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
                      <Ico d={Icons.download} size={18} />
                      Download Apps
                    </a>
                  </>
                ) : (
                  <>
                    <a href="/auth?tab=signup" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }} aria-label="Get Zoop Free — create Zoop ID">
                      Get Zoop Free
                      <Ico d={Icons.arrowRight} size={16} />
                    </a>
                    <a href="/how-it-works" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }} aria-label="See how Zoop works in 30 seconds">
                      See how it works (30s)
                    </a>
                  </>
                )}
              </div>
              <div className="lp-hero-trust-bar" aria-label="Key guarantees">
                <span className="lp-trust-item"><Ico d={Icons.check} size={14} /> 5 devices free</span>
                <span className="lp-trust-sep" aria-hidden="true" />
                <span className="lp-trust-item"><Ico d={Icons.shield} size={14} /> End-to-end encrypted</span>
                <span className="lp-trust-sep" aria-hidden="true" />
                <span className="lp-trust-item"><Ico d={Icons.zap} size={14} /> Zero middleman lag</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 560, borderRadius: 20, border: '1px solid rgba(8,242,255,0.25)', animation: 'lpPulseGlow 6s ease-in-out infinite', background: '#06090e' }}>
                <div style={{ overflow: 'hidden', borderRadius: 20 }}>
                  <img
                    src="/assets/zoop_hero_connect.jpg"
                    alt="Direct encrypted connection linking devices with glowing peer mesh"
                    width={1280}
                    height={720}
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>

                {/* Floating Animated Badge 1: Friends Travel */}
                <div className="lp-hero-photo-badge top-right">
                  <img src="/assets/zoop_friends_travel.jpg" alt="Friends sharing data" width={46} height={46} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '0.8rem' }}>Friends on the Go</div>
                    <div style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 600 }}>Instant data sharing</div>
                  </div>
                </div>

                {/* Floating Animated Badge 2: Remote Work */}
                <div className="lp-hero-photo-badge bottom-left">
                  <img src="/assets/zoop_remote_work.jpg" alt="Remote work connection" width={46} height={46} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '0.8rem' }}>Remote Work Freedom</div>
                    <div style={{ color: '#34d399', fontSize: '0.7rem', fontWeight: 600 }}>Zero latency · Home fiber</div>
                  </div>
                </div>

                {/* Floating Badge 3: Pure Internet Speed (no Mac/iPhone words) */}
                <div className="lp-hero-speed-badge">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399', flexShrink: 0 }} aria-hidden />
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--ink)' }}>940 Mbps</span>
                    <span style={{ color: 'var(--muted)', margin: '0 4px' }}>·</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>&lt;1ms direct route</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Strip */}
      <section className="lp-metric-strip" aria-label="System Highlights">
        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Direct Connection Speed</span>
          <span className="lp-metric-val">
            <AnimatedCounter end={99.4} unit="%" decimals={1} />
          </span>
          <span className="lp-metric-sub">
            <Ico d={Icons.check} size={12} /> Direct Device-to-Device Speed
          </span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Connection Lag</span>
          <span className="lp-metric-val">
            &lt; <AnimatedCounter end={1} unit=" ms" />
          </span>
          <span className="lp-metric-sub">Feels like local Wi-Fi</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Privacy &amp; Security</span>
          <span className="lp-metric-val">100%</span>
          <span className="lp-metric-sub">End-to-End Encrypted</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Connection Reliability</span>
          <span className="lp-metric-val">
            <AnimatedCounter end={99.9} unit="%" decimals={1} />
          </span>
          <span className="lp-metric-sub">Seamless Wi-Fi &amp; 5G roaming</span>
        </div>
      </section>

      {/* ─── Real-World Everyday Scenarios ────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Real Freedom · Everyday Scenarios</p>
          <h2>Built for how you actually live and connect.</h2>
          <p className="lp-subtext">No IT degree required. Just real-world internet freedom for friends, travelers, families, and remote workers.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
          {/* Scenario 1: Friends on the Go */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 240, overflow: 'hidden', position: 'relative' }}>
              <img
                src="/assets/zoop_friends_travel.jpg"
                alt="Friends sharing fast internet together at a cafe while traveling"
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(6,9,14,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
                Travel &amp; Adventures
              </span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Share mobile data with friends anywhere in the world.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Traveling with friends? When one person has an unlimited eSIM or fast connection, share it with your travel buddies in one tap. No sharing sensitive hotspot passwords, no sketchy public Wi-Fi, and no extra roaming charges.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> One tap to approve · Revoke anytime
              </div>
            </div>
          </div>

          {/* Scenario 2: Remote Work Freedom */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 240, overflow: 'hidden', position: 'relative' }}>
              <img
                src="/assets/zoop_remote_work.jpg"
                alt="Remote worker enjoying lag-free connection to home setup from a scenic balcony"
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(6,9,14,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#34d399', fontSize: '0.72rem', fontWeight: 700 }}>
                Remote Work &amp; Nomads
              </span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Your home workstation follows you to every coffee shop.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Working from a beachside cafe or remote cabin? Access your home desktop, files, and high-speed fiber as if you were sitting right at your desk. Sub-millisecond added latency means zero lag when editing files, coding, or gaming.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> Zero lag · Continuous Wi-Fi &amp; 5G roaming
              </div>
            </div>
          </div>

          {/* Scenario 3: Family & Home Cloud */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 240, overflow: 'hidden', position: 'relative' }}>
              <img
                src="/assets/zoop_family_mesh.jpg"
                alt="Family and friends securely connected across home and mobile devices"
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(6,9,14,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#a78bfa', fontSize: '0.72rem', fontWeight: 700 }}>
                Home &amp; Family Cloud
              </span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Lend fast home broadband to your entire family fleet.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Keep your kids, partners, and family devices securely linked to your high-speed home network when they are away. Stream private home media and access network storage without paying monthly cloud subscriptions.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> Up to 5 personal devices free forever
              </div>
            </div>
          </div>

          {/* Scenario 4: Ultra Low-Latency Gaming & Co-Op */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 240, overflow: 'hidden', position: 'relative' }}>
              <img
                src="/assets/zoop_gaming_mesh.jpg"
                alt="Low latency direct route for gaming and creative live collaboration"
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(6,9,14,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700 }}>
                Low-Latency Gaming &amp; Co-Op
              </span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                Direct LAN gaming over the internet with zero port forwarding.
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
                Tired of strict NAT type warnings, complex router port forwarding, or laggy public servers? Zoop connects your gaming rigs directly with sub-millisecond added latency. Play LAN multiplayer games with friends across town or continents.
              </p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, marginTop: 6 }}>
                <Ico d={Icons.check} size={13} /> Sub-millisecond direct routes · NAT bypass
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Up in 3 Taps — No Servers, No Config</p>
          <h2>No complicated setup. Just install and connect.</h2>
          <p className="lp-subtext">Zoop handles encryption and networking automatically. You handle one tap.</p>
        </div>

        <div className="lp-steps-grid">
          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.download} size={22} /></div>
              <span className="lp-step-num">01</span>
            </div>
            <h3>1. Install on Your Devices</h3>
            <p>Runs quietly on your laptop, home PC, phone, or router. Lightweight, gentle on battery, and uses ~12MB RAM.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
              <span className="lp-step-num">02</span>
            </div>
            <h3>2. Connect in One Tap</h3>
            <p>Authorize friends, family, or your own devices with a single tap. A direct encrypted link forms instantly.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.shield} size={22} /></div>
              <span className="lp-step-num">03</span>
            </div>
            <h3>3. Stay Connected, Anywhere</h3>
            <p>Move freely between Wi-Fi and 5G without dropped calls or interrupted downloads. Encrypted and fast.</p>
          </div>
        </div>
      </section>

      {/* Comparison table — why not VPN */}
      <section className="lp-section" aria-labelledby="compare-heading" style={{ paddingTop: 0 }}>
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Why Zoop, not a VPN</p>
          <h2 id="compare-heading">Direct beats detoured.</h2>
          <p className="lp-subtext">Same encryption. Shorter path. You own the route.</p>
        </div>
        <div className="lp-scroll-hint">← Swipe horizontally to compare all features →</div>
        <div className="lp-compare-wrap">
          <div className="lp-table-container">
            <table className="lp-table">
              <thead>
                <tr>
                  <th scope="col" className="lp-col-feature">Feature</th>
                  <th scope="col" className="lp-col-zoop">
                    <span className="lp-badge-zoop">Direct P2P</span>
                    <div>Zoop</div>
                  </th>
                  <th scope="col" className="lp-col-competitor">Traditional VPN</th>
                  <th scope="col" className="lp-col-competitor">Tailscale / Mesh VPN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">How your data travels</th>
                  <td className="lp-cell-zoop">Direct device-to-device (your devices only)</td>
                  <td className="lp-cell-competitor">Via company servers</td>
                  <td className="lp-cell-competitor">Via coordination server + DERP relay</td>
                </tr>
                <tr>
                  <th scope="row">Speed &amp; Added Lag</th>
                  <td className="lp-cell-zoop">~ &lt;1ms direct (relay only if NAT blocks)</td>
                  <td className="lp-cell-competitor">+30–120ms via provider</td>
                  <td className="lp-cell-competitor">+10–40ms (often relayed)</td>
                </tr>
                <tr>
                  <th scope="row">Who can read your traffic?</th>
                  <td className="lp-cell-zoop">No one but your devices (zero-knowledge relay)</td>
                  <td className="lp-cell-competitor">Provider can inspect or decrypt</td>
                  <td className="lp-cell-competitor">Coordination node sees metadata &amp; keys</td>
                </tr>
                <tr>
                  <th scope="row">Works on 5G &amp; hotel Wi-Fi?</th>
                  <td className="lp-cell-zoop">Yes (automatic NAT hole punching)</td>
                  <td className="lp-cell-competitor">Frequently blocked or throttled</td>
                  <td className="lp-cell-competitor">Often drops to slow relay</td>
                </tr>
                <tr>
                  <th scope="row">Setup &amp; Ease</th>
                  <td className="lp-cell-zoop">30 seconds — one tap to connect, no config</td>
                  <td className="lp-cell-competitor">Pick a country server and hope it’s fast</td>
                  <td className="lp-cell-competitor">Requires account setup and IP config</td>
                </tr>
                <tr>
                  <th scope="row">Price</th>
                  <td className="lp-cell-zoop">Free forever for personal (MIT open source)</td>
                  <td className="lp-cell-competitor">$5–$15/month subscriptions</td>
                  <td className="lp-cell-competitor">Free up to 3 users, then $6+/user/month</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="lp-table-footer-note">
            Direct connections provide maximum throughput. When direct path is blocked by strict corporate firewalls, encrypted relay fallback ensures you never lose connection.
          </div>
        </div>
      </section>



      {/* Testimonials — verified open-source contributors */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Built in the open — trusted by early users</p>
          <h2>What early testers say.</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>Early access feedback · <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>Verify on GitHub →</a></p>
        </div>

        <div className="lp-testimonials-grid">
          <div className="lp-test-card">
            <div className="lp-test-stars" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Ico key={i} d={Icons.star} size={14} />
              ))}
            </div>
            <p className="lp-test-quote">
              "I expose my home lab via Zoop instead of port-forwarding. Direct tunnel, no VPS hop — latency cut in half."
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#38bdf8', color: '#020904' }}>G</div>
              <div>
                <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline dotted' }}>GitHub Contributor</a> · Early access</div>
                <div className="lp-test-role">Self-hosted · Ubiquiti + Linux</div>
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
              "Roaming actually works. I walk from office Wi-Fi to 5G mid-call — tunnel stays up via Netlink re-probe."
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#34d399', color: '#020904' }}>G</div>
              <div>
                <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline dotted' }}>Community Tester</a> · Nairobi</div>
                <div className="lp-test-role">Android + macOS mesh</div>
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
              "Families get it instantly: install on the router, everyone at home shares safely. No config beyond Zoop ID."
            </p>
            <div className="lp-test-author">
              <div className="lp-test-avatar" style={{ background: '#a3e635', color: '#0a0e14' }}>G</div>
              <div>
                <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline dotted' }}>OpenWrt Pilot</a> · Lagos</div>
                <div className="lp-test-role">OpenWrt · Family sharing</div>
              </div>
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.72rem', color: 'var(--muted)' }}>Want to be quoted? Open an issue with your story — we link your GitHub profile with permission.</p>
      </section>

      {/* CTA Banner — rewritten for clarity + conversion */}
      <section className="lp-section">
        <div className="lp-cta-banner">
          <div className="lp-cta-copy">
            <h2>Stop renting your own internet back from a VPN.</h2>
            <p>Your traffic stays on your devices. Direct, encrypted, and yours — in 30 seconds.</p>
          </div>
          <div className="lp-cta-actions">
            <a href="/downloads" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
              <Ico d={Icons.download} size={18} />
              Get Zoop Free
            </a>
            <a href="/app" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>
              Open Web Console
            </a>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar + FAQ — SEO/AI & Conversion (S2-05, S4-02) ─── */}
      <section className="lp-trust-bar" aria-label="Trusted technology">
        <div className="lp-trust-inner">
          <span className="lp-trust-label">Built with proven, audited technology</span>
          <div className="lp-trust-badges">
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#34d399' }} aria-hidden />WireGuard® encrypted</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#38bdf8' }} aria-hidden />Ed25519 auth</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#a3e635' }} aria-hidden />Open source MIT</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#f59e0b' }} aria-hidden />No tracking · No logs</span>
            <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#60a5fa' }} aria-hidden />STUN/TURN NAT traversal</span>
          </div>
        </div>
      </section>

      <section className="lp-section lp-faq" aria-labelledby="faq-heading">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Answers at a Glance</p>
          <h2 id="faq-heading">Frequently asked questions.</h2>
          <p className="lp-subtext">Everything decision-makers and LLM assistants need to cite Zoop correctly.</p>
        </div>
        <div className="lp-faq-grid">
          {[
            { q: 'What is Zoop?', a: 'Zoop is an open-source direct device-to-device mesh that lets you share your home, phone or office internet with trusted devices — laptops, family phones or routers — via encrypted tunnels, not centralized VPN servers.' },
            { q: 'How is Zoop different from a VPN?', a: 'Traditional VPNs route all your traffic through company servers, adding hops and latency. Zoop creates direct WireGuard tunnels device-to-device; your data takes the fastest path and stays private. Relays only act as fallback for strict NAT.' },
            { q: 'Is my traffic private and encrypted?', a: 'Yes. Every payload is end-to-end encrypted with WireGuard (ChaCha20-Poly1305 + Curve25519) and authenticated with Ed25519. The control plane and relays coordinate signaling and IP allocation — they cannot decrypt your traffic. Zero tracking logs.' },
            { q: 'Does it work behind NAT and mobile carriers (CGNAT)?', a: 'Yes — Zoop discovers local (host) and public (server-reflexive via STUN) candidates, hole-punches with UDP probes, and falls back to low-latency WebSocket relays when direct is impossible. Roaming between Wi-Fi ↔ cellular is automatic via Netlink events.' },
            { q: 'What platforms can I run it on?', a: 'Linux (systemd/TUN), macOS (utun/launchd), Windows (Wintun), Android (VpnService), iOS (NetworkExtension) and OpenWrt routers. The web console manages devices, sharing and orgs in any browser.' },
            { q: 'What is the Zoop ID and PIN?', a: 'Your permanent Zoop ID looks like ZP-7K4M9X and your mutable handle is @username; you sign in with your 6-digit PIN. No email required. Devices derive a deterministic Endpoint ID from your Ed25519 public key.' },
            { q: 'Is Zoop free and open source?', a: 'Yes — MIT-licensed. Self-host the control plane with Postgres or use the ephemeral in-memory store for development. Download for Linux, macOS, Windows, Android, iOS and routers.' },
          ].map(({ q, a }) => (
            <details key={q} className="lp-faq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <p className="lp-faq-note"><abbr title="STUN — Session Traversal Utilities for NAT: discovers your public IP/port">STUN</abbr> · <abbr title="TURN — Traversal Using Relays around NAT: relay fallback">TURN</abbr> · <abbr title="CGNAT — Carrier-Grade NAT: large-scale NAT by mobile ISPs">CGNAT</abbr> · <abbr title="WireGuard — modern VPN cryptography">WireGuard</abbr> — hover for definitions.</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is Zoop?', acceptedAnswer: { '@type': 'Answer', text: 'Zoop is an open-source direct device-to-device mesh that lets you share your home, phone or office internet with trusted devices via encrypted tunnels.' } },
        { '@type': 'Question', name: 'How is Zoop different from a VPN?', acceptedAnswer: { '@type': 'Answer', text: 'Traditional VPNs route all your traffic through company servers. Zoop creates direct WireGuard tunnels device-to-device, so your data takes the fastest path and stays private.' } },
        { '@type': 'Question', name: 'Is my traffic private and encrypted?', acceptedAnswer: { '@type': 'Answer', text: 'Every payload is end-to-end encrypted with WireGuard and authenticated with Ed25519. The control plane and relays cannot decrypt your traffic.' } },
        { '@type': 'Question', name: 'Does it work behind NAT and mobile carriers (CGNAT)?', acceptedAnswer: { '@type': 'Answer', text: 'Zoop discovers host and server-reflexive candidates via STUN, hole-punches, and falls back to relay when direct fails. Roaming is automatic.' } },
        { '@type': 'Question', name: 'What platforms are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Linux, macOS, Windows, Android, iOS and OpenWrt, plus a web console for management.' } },
        { '@type': 'Question', name: 'What is the Zoop ID and PIN?', acceptedAnswer: { '@type': 'Answer', text: 'Your permanent Zoop ID is ZP-XXXXXX plus a mutable @username; sign in with a 6-digit PIN. No email required.' } },
        { '@type': 'Question', name: 'Is Zoop free and open source?', acceptedAnswer: { '@type': 'Answer', text: 'MIT-licensed and free. Self-hostable control plane with Postgres or in-memory store.' } },
      ] }) }} />
    </>
  );
};
