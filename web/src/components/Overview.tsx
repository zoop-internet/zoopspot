import React from 'react';
import { Activity, ShieldCheck, Zap, Server, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const Overview: React.FC = () => {
  return (
    <div>
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-label">
            <Server size={14} style={{ display: 'inline', marginRight: 6 }} />
            Active Registered Devices
          </div>
          <div className="stat-value">4</div>
          <span style={{ fontSize: '0.85rem', color: '#14f06d' }}>✓ 3 Trusted, 1 Revoked</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">
            <Zap size={14} style={{ display: 'inline', marginRight: 6 }} />
            Direct P2P Tunnels
          </div>
          <div className="stat-value">2</div>
          <span style={{ fontSize: '0.85rem', color: '#08f2ff' }}>STUN Hole Punch Active</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">
            <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
            Relay Fallback Paths
          </div>
          <div className="stat-value">1</div>
          <span style={{ fontSize: '0.85rem', color: '#b9ff00' }}>DERP WebSocket Active</span>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">
            <Activity size={14} style={{ display: 'inline', marginRight: 6 }} />
            Live Network Throughput
          </div>
          <div className="stat-value">14.2 MB/s</div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: 'var(--muted)' }}>
            <span style={{ color: '#14f06d' }}>
              <ArrowDownRight size={14} style={{ verticalAlign: 'middle' }} /> Rx: 11.4 MB/s
            </span>
            <span style={{ color: '#08f2ff' }}>
              <ArrowUpRight size={14} style={{ verticalAlign: 'middle' }} /> Tx: 2.8 MB/s
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 12, fontWeight: 700 }}>
          Live Connection Topology
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>
          Real-time WireGuard data plane connectivity across registered endpoints.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>Ubuntu Desktop (Provider)</span>
              <span className="status-badge direct">
                <span className="pulse-dot" style={{ backgroundColor: '#14f06d' }}></span>
                Direct P2P
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Endpoint: 192.168.1.105:45221 (Host LAN)<br />
              Latency: 4.2ms | Handshake: 2s ago
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>Android Mobile (Recipient)</span>
              <span className="status-badge relayed">
                <span className="pulse-dot" style={{ backgroundColor: '#08f2ff' }}></span>
                Relayed (DERP)
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Endpoint: ws://relay.zoop.net/v1/relay<br />
              Cellular 5G | Auto-reprobing background
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
