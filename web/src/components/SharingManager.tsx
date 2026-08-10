import React, { useState } from 'react';
import { Share2, UserCheck, Lock, Plus } from 'lucide-react';

interface ShareRule {
  id: string;
  recipientEmail: string;
  providerDevice: string;
  allowedSubnet: string;
  status: 'active' | 'pending';
}

export const SharingManager: React.FC = () => {
  const [shares] = useState<ShareRule[]>([
    {
      id: 's1',
      recipientEmail: 'alex.dev@organization.com',
      providerDevice: 'Primary Workstation (Linux)',
      allowedSubnet: '0.0.0.0/0 (Full Exit Node)',
      status: 'active',
    },
    {
      id: 's2',
      recipientEmail: 'sam.mobile@organization.com',
      providerDevice: 'Home Gateway Router (OpenWrt)',
      allowedSubnet: '192.168.1.0/24 (LAN Only)',
      status: 'active',
    },
  ]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Sharing & Access Management</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Control which accounts and recipients are authorized to connect to your Provider devices.
          </p>
        </div>
        <button className="primary-button">
          <Plus size={16} /> Grant Sharing Permission
        </button>
      </div>

      <table className="custom-table">
        <thead>
          <tr>
            <th>Authorized Recipient</th>
            <th>Provider Device</th>
            <th>Allowed Subnet / Scope</th>
            <th>Status</th>
            <th>Security Policy</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((rule) => (
            <tr key={rule.id}>
              <td style={{ fontWeight: 700 }}>
                <UserCheck size={14} style={{ display: 'inline', marginRight: 6, color: '#14f06d' }} />
                {rule.recipientEmail}
              </td>
              <td>{rule.providerDevice}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--cyan)' }}>
                {rule.allowedSubnet}
              </td>
              <td>
                <span className="status-badge trusted">Active</span>
              </td>
              <td>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={12} /> Ed25519 Signed & Auth Enforced
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
