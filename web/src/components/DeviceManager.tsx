import React, { useState } from 'react';
import { RefreshCw, Ban, Plus, ShieldCheck } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  os: string;
  pubKey: string;
  state: 'trusted' | 'revoked' | 'suspended';
  lastSeen: string;
}

export const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: 'd973c380-5f4e-4533-9533-93b2557b4c65',
      name: 'Primary Workstation',
      os: 'Linux (Ubuntu 24.04)',
      pubKey: '7DMP50vW43VDhnJP7ETLa5ttijZZuiZ0yignNqkHkRY=',
      state: 'trusted',
      lastSeen: 'Active Now',
    },
    {
      id: '468cbe22-025f-4fc5-a7fc-c27b26104d32',
      name: 'Pixel 8 Pro (Mobile)',
      os: 'Android 14 (VpnService)',
      pubKey: '0N40yvg1btRVT6S0q58pfsDXpYqky8StCutDGjjx6hQ=',
      state: 'trusted',
      lastSeen: '2 mins ago',
    },
    {
      id: 'fe5e3327-df83-49de-af5c-53d32d5ac418',
      name: 'Home Gateway Router',
      os: 'OpenWrt 23.05 (zoop-router)',
      pubKey: 'x8f7abf6eb44c684a1a78d89b9955c1129482819a=',
      state: 'trusted',
      lastSeen: 'Active Now',
    },
    {
      id: '83cbea2f-1b1a-4cd8-ba5e-45db30604ce9',
      name: 'Stolen Laptop (Compromised)',
      os: 'Linux (Fedora)',
      pubKey: 'REVOKED_KEY_HASH_99410291029312930219491',
      state: 'revoked',
      lastSeen: 'Revoked on 2026-08-11',
    },
  ]);

  const handleRotateKey = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const newKey = 'ROTATED_' + Math.random().toString(36).substring(2, 12).toUpperCase() + '=';
          return { ...d, pubKey: newKey };
        }
        return d;
      })
    );
  };

  const handleRevokeDevice = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return { ...d, state: 'revoked', lastSeen: 'Revoked Just Now' };
        }
        return d;
      })
    );
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registered Endpoint Devices</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage authorized Zoop devices, rotate WireGuard keys, and enforce device revocation.
          </p>
        </div>
        <button className="primary-button">
          <Plus size={16} /> Register New Device
        </button>
      </div>

      <table className="custom-table">
        <thead>
          <tr>
            <th>Device Name & OS</th>
            <th>Device ID</th>
            <th>WireGuard Public Key</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>
                <div style={{ fontWeight: 700 }}>{device.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{device.os}</div>
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{device.id.substring(0, 18)}...</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--cyan)' }}>
                {device.pubKey.substring(0, 24)}...
              </td>
              <td>
                {device.state === 'trusted' && (
                  <span className="status-badge trusted">
                    <ShieldCheck size={12} /> Trusted
                  </span>
                )}
                {device.state === 'revoked' && (
                  <span className="status-badge revoked">
                    <Ban size={12} /> Revoked
                  </span>
                )}
              </td>
              <td>
                {device.state === 'trusted' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="secondary-button"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleRotateKey(device.id)}
                      title="Rotate WireGuard Key"
                    >
                      <RefreshCw size={14} /> Rotate Key
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => handleRevokeDevice(device.id)}
                      title="Revoke Device Immediately"
                    >
                      <Ban size={14} /> Revoke
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Blocked</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
