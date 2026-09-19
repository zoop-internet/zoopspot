import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';

interface SecurityPageProps {
  handleNav: (path: string) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ handleNav }) => {
  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Privacy First</p>
        <h1>Your internet. Truly private to you.</h1>
        <h2>Security Principles &amp; Protections</h2>
        <p>We built Zoop with a simple promise: we never store, inspect, or sell your private browsing traffic.</p>
      </div>

      <div className="lp-security-grid">
        <div className="lp-sec-card">
          <div className="lp-sec-icon"><Ico d={Icons.shield} size={20} /></div>
          <h3>Direct Device-to-Device</h3>
          <p>Your data flows straight between your devices. It does not pass through intermediate company servers — relays only forward opaque encrypted frames when direct hole-punch fails.</p>
        </div>

        <div className="lp-sec-card">
          <div className="lp-sec-icon"><Ico d={Icons.zap} size={20} /></div>
          <h3>WireGuard® Encryption</h3>
          <p><abbr title="WireGuard — Noise_IK handshake, ChaCha20-Poly1305, Curve25519, BLAKE2s">WireGuard®</abbr> with ChaCha20-Poly1305 &amp; Curve25519. Forward-secrecy via Noise_IK; each tunnel uses ephemeral keys.</p>
        </div>

        <div className="lp-sec-card">
          <div className="lp-sec-icon"><Ico d={Icons.server} size={20} /></div>
          <h3>Zero Activity Tracking</h3>
          <p>No tracking logs, no history records, no ads. Control plane stores only signaling metadata &amp; IPAM; payload is opaque to relays.</p>
        </div>

        <div className="lp-sec-card">
          <div className="lp-sec-icon"><Ico d={Icons.terminal} size={20} /></div>
          <h3>Open Source &amp; Audited</h3>
          <p>MIT-licensed, built in the open. Ed25519 identities signed with canonical `zoop-auth-v2` payload + replay nonces (bounded cache) &amp; 5-min TTL.</p>
        </div>
      </div>

      <div style={{ marginTop: 32, background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Cryptographic Architecture &amp; Formal Standards</h3>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--muted)', margin: '0 0 16px' }}>
          Zoop implements peer-to-peer data plane encryption using <abbr title="WireGuard — modern VPN protocol"><strong>WireGuard®</strong></abbr> with 1-RTT key exchange and forward secrecy. Control plane signaling and device identity authentication are anchored entirely by <strong>Ed25519</strong> asymmetric cryptography. Relays operate in zero-decryption mode (DERP-style <code>ws://</code>) and can only inspect opaque frames, never payloads.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, margin: '16px 0', fontSize: '0.8125rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <strong style={{ color: 'var(--ink)' }}>Noise_IK Handshake:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)' }}>Mutual authentication with static-ephemeral Diffie-Hellman key agreement providing forward secrecy.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <strong style={{ color: 'var(--ink)' }}>RFC 8439 (AEAD):</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)' }}>ChaCha20-Poly1305 authenticated symmetric stream cipher for all in-flight packets.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <strong style={{ color: 'var(--ink)' }}>RFC 7748 &amp; RFC 8032:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)' }}>Curve25519 elliptic-curve Diffie-Hellman and Ed25519 high-speed digital signatures.</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
            <strong style={{ color: 'var(--ink)' }}>RFC 6598 IPAM:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)' }}>Isolated Carrier-Grade Shared Address Space (<code>100.64.0.0/10</code>) allocated as point-to-point /30 subnets.</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="lp-trust-badge">WireGuard® · Noise_IK</span>
          <span className="lp-trust-badge">RFC 8439 · ChaCha20-Poly1305</span>
          <span className="lp-trust-badge">RFC 8032 · Ed25519</span>
          <span className="lp-trust-badge">RFC 6598 · 100.64.0.0/10</span>
        </div>
      </div>

      <div style={{ marginTop: 24, background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ico d={Icons.shield} size={20} />
          Security &amp; Vulnerability Disclosure
        </h3>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--muted)', margin: '0 0 16px' }}>
          We welcome responsible security research and vulnerability disclosures. If you discover a security issue or cryptographic vulnerability in the Zoop protocol, client daemon, or control plane, please notify our security team directly.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', fontSize: '0.875rem' }}>
          <div>
            <strong style={{ color: 'var(--ink)' }}>Email: </strong>
            <a href="mailto:security@zoopinternet.app" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
              security@zoopinternet.app
            </a>
          </div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>PGP Key &amp; Policy: </strong>
            <a href="https://github.com/zoop-internet/zoop/blob/main/SECURITY.md" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
              Zoop Security Advisory &amp; PGP Key →
            </a>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 12, marginBottom: 0 }}>
          We commit to acknowledging reports within 24 hours and providing coordinated disclosure timelines following industry best practices.
        </p>
      </div>

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
