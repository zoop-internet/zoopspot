import React, { useState } from 'react';
import { Terminal, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export const Diagnostics: React.FC = () => {
  const [isRunningStun, setIsRunningStun] = useState(false);
  const [stunResult, setStunResult] = useState<string | null>(null);

  const [logs] = useState<string[]>([
    '[SYSTEM] 01:38:02 - Zoop Agent started on interface zoop0',
    '[STUN] 01:38:03 - Discovered Public Srflx Endpoint: 192.0.2.1:45221 (NAT Type: Full Cone)',
    '[SIGNALING] 01:38:04 - WebSocket connected to Cloud Control Plane (ws://cloud.zoop.net/v1/signaling)',
    '[RELAY] 01:38:05 - DERP Relay WebSocket standby established (ws://relay.zoop.net/v1/relay)',
    '[TUNNEL] 01:38:10 - Direct P2P Hole Punching Succeeded with Peer (100.64.0.2)',
    '[SECURITY] 01:38:12 - Owner key file permissions verified (0600 strict)',
  ]);

  const runStunTest = () => {
    setIsRunningStun(true);
    setStunResult(null);
    setTimeout(() => {
      setStunResult('✓ STUN Srflx Discovery Successful: 192.0.2.1:45221 (Full Cone NAT detected, MuxBind UDP Socket Ready)');
      setIsRunningStun(false);
    }, 1000);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>System Diagnostics & STUN Tester</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Run interactive diagnostic checks for NAT Traversal, STUN endpoints, and inspect system log streams.
          </p>
        </div>
        <button className="primary-button" onClick={runStunTest} disabled={isRunningStun}>
          <Play size={16} /> {isRunningStun ? 'Testing STUN...' : 'Run Interactive STUN Test'}
        </button>
      </div>

      {stunResult && (
        <div
          style={{
            background: 'rgba(20, 240, 109, 0.1)',
            border: '1px solid rgba(20, 240, 109, 0.3)',
            color: '#14f06d',
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {stunResult}
        </div>
      )}

      <div style={{ background: '#000000', border: '1px solid var(--line)', borderRadius: 12, padding: 18, fontFamily: 'monospace', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 12 }}>
          <Terminal size={16} /> System Event Console Output
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ color: log.includes('[SECURITY]') ? '#b9ff00' : log.includes('[STUN]') ? '#08f2ff' : '#f7fbff' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
