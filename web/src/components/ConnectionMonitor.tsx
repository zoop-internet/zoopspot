import React, { useState } from 'react';
import { Shield, Zap, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const ConnectionMonitor: React.FC = () => {
  const [isSimulatingFailover, setIsSimulatingFailover] = useState(false);
  const [pathState, setPathState] = useState<'direct' | 'relayed'>('direct');

  const toggleFailover = () => {
    setIsSimulatingFailover(true);
    setTimeout(() => {
      setPathState((prev) => (prev === 'direct' ? 'relayed' : 'direct'));
      setIsSimulatingFailover(false);
    }, 1200);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Active Tunnel Connection Monitor</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Monitor real-time Provider $\leftrightarrow$ Recipient WireGuard data paths, candidate health, and DERP relay fallbacks.
          </p>
        </div>

        <button className="secondary-button" onClick={toggleFailover} disabled={isSimulatingFailover}>
          <RefreshCw size={16} className={isSimulatingFailover ? 'animate-spin' : ''} />
          {isSimulatingFailover ? 'Probing Path...' : 'Simulate Network Switch'}
        </button>
      </div>

      <div
        style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 16,
          border: '1px solid var(--line)',
          padding: 24,
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Provider Side */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--cyan)' }}>Provider Endpoint</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Ubuntu Linux Workstation</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 12px',
              borderRadius: 6,
              marginTop: 10,
              display: 'inline-block',
            }}
          >
            100.64.0.1 / 192.168.1.105:45221
          </div>
        </div>

        {/* Path Status Middle */}
        <div style={{ textAlign: 'center' }}>
          {pathState === 'direct' ? (
            <div>
              <span className="status-badge direct" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                <Zap size={16} /> Direct P2P Tunnel
              </span>
              <div style={{ fontSize: '0.8rem', color: '#14f06d', marginTop: 8 }}>
                STUN Hole Punch Active (Latency: 3.8ms)
              </div>
            </div>
          ) : (
            <div>
              <span className="status-badge relayed" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                <Shield size={16} /> Relayed Fallback
              </span>
              <div style={{ fontSize: '0.8rem', color: '#08f2ff', marginTop: 8 }}>
                WebSocket Relay Active (DERP)
              </div>
            </div>
          )}
        </div>

        {/* Recipient Side */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--green)' }}>Recipient Endpoint</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>Pixel 8 Pro (Cellular 5G)</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px 12px',
              borderRadius: 6,
              marginTop: 10,
              display: 'inline-block',
            }}
          >
            100.64.0.2 / 54.210.12.8:54321
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowDownRight size={16} style={{ color: '#14f06d' }} /> Received Traffic (Rx)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>452.8 MB</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>Packets: 320,412 | Rate: 11.4 MB/s</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 12, border: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpRight size={16} style={{ color: '#08f2ff' }} /> Transmitted Traffic (Tx)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>89.4 MB</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 4 }}>Packets: 68,190 | Rate: 2.8 MB/s</div>
        </div>
      </div>
    </div>
  );
};
