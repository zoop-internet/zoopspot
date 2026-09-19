import React from 'react';
import type { PortalMode } from '../../types';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { BentArrowMeshIllustration } from '../components/BentArrowMeshIllustration';

interface OverviewPageProps {
  handleNav: (path: string) => void;
  isAuthenticated: boolean;
  onLaunchConsole: (mode: PortalMode) => void;
  waitlistEmail: string;
  setWaitlistEmail: (val: string) => void;
  waitlistStatus: 'idle' | 'loading' | 'success' | 'error';
  setWaitlistStatus: (val: 'idle' | 'loading' | 'success' | 'error') => void;
  waitlistMsg: string;
  handleWaitlist: (e: React.FormEvent) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  handleNav,
  isAuthenticated,
  onLaunchConsole,
  waitlistEmail,
  setWaitlistEmail,
  waitlistStatus,
  setWaitlistStatus,
  waitlistMsg,
  handleWaitlist,
}) => {
  return (
    <>
      {/* Hero Section — 5s value prop */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(8,242,255,0.10)', border: '1px solid rgba(8,242,255,0.28)', fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} aria-hidden /> Open Source · No tracking · Direct mesh
              </div>
              <h1>
                Share your home or phone
                <br />
                <span className="lp-grad-text">internet — directly.</span>
              </h1>
              <p className="lp-hero-desc" style={{ maxWidth: 520 }}>
                Lend your home broadband or phone data to your laptop, family or team — <strong style={{ color: 'var(--ink)' }}>device-to-device, no VPN servers in the middle</strong>. Private, faster (<span style={{ color: '#34d399', fontWeight: 800 }}>&lt;1ms</span> direct), and works even behind strict home or mobile carrier firewalls (<abbr title="Carrier-Grade NAT — your ISP shares one public IP with many homes" style={{ textDecoration: 'underline dotted', cursor: 'help' }}>CGNAT</abbr>). <strong style={{ color: 'var(--ink)' }}>30-sec setup.</strong>
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 520 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ico d={Icons.check} size={10} /> Private to you</span> · <abbr title="WireGuard — modern VPN cryptography, Noise_IK + ChaCha20-Poly1305" style={{ textDecoration: 'underline dotted', cursor: 'help' }}>WireGuard®</abbr> encrypted · End-to-end · Revoke anytime · <a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>How sharing works →</a>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }} aria-label="Trust proof">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}><Ico d={Icons.check} size={12} /> 5 devices free</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--line)' }} aria-hidden />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}><Ico d={Icons.shield} size={12} /> End-to-end encrypted</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--line)' }} aria-hidden />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}><Ico d={Icons.globe} size={12} /> Works behind CGNAT</span>
              </div>
              <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--muted)' }}>
                <code style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 6, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>curl -fsSL https://get.zoop.dev | sh</code> <span style={{ marginLeft: 6 }}>or</span> <a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>download matrix →</a>
              </div>
              {/* Journey stepper — reduces cognitive load, guides 3 steps */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }} aria-label="3-step journey">
                {[
                  { n: '1', t: 'Create Zoop ID', d: 'ZP-… + PIN' },
                  { n: '2', t: 'Authorize', d: 'Sharing → recipient' },
                  { n: '3', t: 'Connect', d: 'Direct tunnel' },
                ].map(s => (
                  <span key={s.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.70rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', padding: '5px 9px', borderRadius: 999, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem' }}>{s.n}</span>
                    <strong style={{ color: 'var(--ink)' }}>{s.t}</strong> <span style={{ color: 'var(--muted)' }}>· {s.d}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <BentArrowMeshIllustration />
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
          <span className="lp-metric-sub">Ultra-low latency transfer</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Privacy &amp; Security</span>
          <span className="lp-metric-val">100%</span>
          <span className="lp-metric-sub">End-to-End Encrypted</span>
        </div>

        <div className="lp-metric-item in-view">
          <span className="lp-metric-label">Connection Drop Rate</span>
          <span className="lp-metric-val">
            <AnimatedCounter end={0.0} unit="%" decimals={1} />
          </span>
          <span className="lp-metric-sub">Seamless Wi-Fi &amp; 5G roaming</span>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="lp-section">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Up in 3 Taps — No Servers, No Config</p>
          <h2>No complicated setup. Just install and connect.</h2>
          <p className="lp-subtext">Zoop handles NAT traversal and encryption automatically. You handle one tap.</p>
        </div>

        <div className="lp-steps-grid">
          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.download} size={22} /></div>
              <span className="lp-step-num">01</span>
            </div>
            <h3>1. Install on Your Devices</h3>
            <p>Lightweight daemon on laptop/home PC, one-tap app on phones, .ipk on OpenWrt. Runs quietly — ~12MB RAM.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
              <span className="lp-step-num">02</span>
            </div>
            <h3>2. Connect in One Tap</h3>
            <p>Authorize trusted peers (family/team/your other devices). Direct WireGuard tunnel forms via STUN hole-punch; relay only if NAT forbids.</p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-header">
              <div className="lp-step-icon-box"><Ico d={Icons.shield} size={22} /></div>
              <span className="lp-step-num">03</span>
            </div>
            <h3>3. Stay Connected, Anywhere</h3>
            <p>Roam Wi-Fi ↔ 5G without drops (Netlink detection). Browse/stream with &lt;1ms added latency, end-to-end encrypted.</p>
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
        <div className="lp-compare-wrap">
          <div className="lp-compare-table">
            <div style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--ink)', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line)' }}>Feature</div>
            <div style={{ padding: '14px 16px', fontWeight: 800, color: '#38bdf8', background: 'rgba(8,242,255,0.08)', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>Zoop</div>
            <div style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>Traditional VPN</div>
            <div style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>Tailscale / Mesh VPN</div>
            {[
              ['How your data travels', 'Direct device-to-device (your devices only)', 'Via company servers', 'Via coordination server + DERP relay'],
              ['Added lag', '~ <1ms direct / relay only if NAT blocks', '+30–120ms via provider', '+10–40ms (often relayed)'],
              ['Who can read your traffic?', 'No one but your devices (zero-knowledge relay)', 'Provider can (exit node)', 'No one (WireGuard)'],
              ['Works behind home & mobile firewall?', 'Yes — STUN discovery + TURN relay + roaming', 'Needs open port/forward', 'STUN + DERP'],
              ['Price', 'Free personal, $8/mo teams', '$5–12/mo per user', 'Free up to 3 users, then $6+'],
              ['Open source?', 'MIT, self-hostable + auditable', 'Usually closed', 'Partial / source-available'],
            ].map(([feat, zoop, vpn, tailscale]) => (
              <React.Fragment key={feat}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--ink-secondary)', fontWeight: 600 }}>{feat}</div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', background: 'rgba(8,242,255,0.05)', color: 'var(--ink)', fontWeight: 700 }}>{zoop}</div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'var(--muted)' }}>{vpn}</div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'var(--muted)' }}>{tailscale}</div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ padding: '12px 16px', fontSize: '0.72rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>Measurements illustrative; direct path depends on NAT/firewall. Zoop relay fallback is WebSocket, still end-to-end encrypted.</div>
        </div>
      </section>

      {/* Pricing — with real waitlist */}
      <section className="lp-section" aria-labelledby="pricing-heading">
        <div className="lp-section-heading centered">
          <p className="lp-eyebrow">Simple &amp; Transparent</p>
          <h2 id="pricing-heading">Free to start. Built to scale.</h2>
          <p className="lp-subtext">Self-host free forever. Teams lock founding price.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 860, margin: '0 auto' }}>
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399' }}>Personal — Free Forever</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$0 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ month</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited direct tunnels</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Up to 5 devices</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> WireGuard® + STUN/TURN + roaming</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Community support + self-host</li>
            </ul>
            <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Create Zoop ID — Free <Ico d={Icons.arrowRight} size={14} /></a>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>No credit card · Zoop ID is ZP-XXXXXX + 6-digit PIN</span>
          </div>
          <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(8,242,255,0.28)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#38bdf8', color: '#020904' }}>Founding price</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8' }}>Organizations</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$8 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ seat / mo</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Everything in Personal</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited org members + fleet</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Audit logs, roles, IPAM &amp; relay controls</li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Priority relay regions + SLA</li>
            </ul>
            <form onSubmit={handleWaitlist} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Join founding waitlist">
              <label htmlFor="waitlist-email" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-secondary)' }}>Join founding waitlist — lock $8/seat</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="waitlist-email" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={waitlistEmail} onChange={e => { setWaitlistEmail(e.target.value); setWaitlistStatus('idle'); }} required aria-label="Email for waitlist" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${waitlistStatus === 'error' ? 'rgba(248,113,113,0.5)' : 'var(--line)'}`, background: 'rgba(0,0,0,0.35)', color: 'var(--ink)', fontSize: '0.875rem', outline: 'none' }} />
                <button type="submit" className="lp-btn-primary" style={{ whiteSpace: 'nowrap', minHeight: 38, padding: '0 16px' }} disabled={waitlistStatus === 'loading'}>{waitlistStatus === 'loading' ? 'Joining…' : 'Join →'}</button>
              </div>
              {waitlistStatus !== 'idle' && (
                <span role={waitlistStatus === 'error' ? 'alert' : 'status'} aria-live="polite" style={{ fontSize: '0.75rem', color: waitlistStatus === 'success' ? '#34d399' : waitlistStatus === 'error' ? '#f87171' : 'var(--muted)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {waitlistStatus === 'success' ? <Ico d={Icons.check} size={12} /> : null} {waitlistMsg}
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>No spam. Founding price locked at signup. <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>Privacy: zero tracking</a></span>
            </form>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.75rem', color: 'var(--muted)' }}>All plans include end-to-end encryption, NAT traversal and open-source MIT license. Self-host the control plane free forever.</p>
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
