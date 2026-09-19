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
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>How we encrypt — in 80 words</h3>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--muted)', margin: 0 }}>
          Zoop uses <abbr title="WireGuard — modern VPN protocol"><strong>WireGuard</strong></abbr> (Noise_IK, ChaCha20-Poly1305, Curve25519) for the data plane and <strong>Ed25519</strong> for control-plane auth. Devices derive a deterministic Endpoint ID from their public key (UUIDv5). Signaling uses `zoop-auth-v2|METHOD|PATH|TIMESTAMP|NONCE|BODY_HASH` with bounded 100k nonce cache and strict 0600 key storage (PBKDF2-AES-GCM optional via <code>ZOOP_IDENTITY_PASSPHRASE</code>). Relays are zero-decryption — DERP-style `ws://` forwarding of `[senderID][payload]` only. IPAM from <code>100.64.0.0/10</code> per-RFC6598 assigns /30 pairs (1,048,576 capacity) atomically via Postgres.
        </p>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="lp-trust-badge">WireGuard® · ChaCha20</span>
          <span className="lp-trust-badge">Ed25519 · Nonce + TTL</span>
          <span className="lp-trust-badge">0600 · PBKDF2 · AES-GCM</span>
          <span className="lp-trust-badge">100.64.0.0/10 · /30</span>
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
