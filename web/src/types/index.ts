// Control Plane API & Data Models for Zoop Web

export type Role = 'user' | 'org_admin' | 'zoop_admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId?: string;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  publicKey: string;
  status: 'online' | 'offline' | 'revoked';
  deviceType: 'linux' | 'android' | 'ios' | 'router';
  ipAddress?: string;
  lastSeen: string;
  isProvider: boolean;
  isRecipient: boolean;
}

export interface Connection {
  id: string;
  providerDeviceId: string;
  recipientDeviceId: string;
  providerName: string;
  recipientName: string;
  pathType: 'direct' | 'relayed';
  relayId?: string;
  status: 'connected' | 'connecting' | 'disconnected';
  latencyMs: number;
  txBytes: number;
  rxBytes: number;
  establishedAt: string;
}

export interface SharingRelationship {
  id: string;
  providerUserId: string;
  recipientUserId: string;
  permissions: string[];
  status: 'active' | 'pending' | 'rejected' | 'revoked';
}

export interface Organization {
  id: string;
  name: string;
  memberCount: number;
  deviceCount: number;
  activeTunnels: number;
  createdAt: string;
}

export interface RelayNode {
  id: string;
  name: string;
  region: string;
  ipAddress: string;
  activeConnections: number;
  bandwidthMbps: number;
  status: 'healthy' | 'degraded' | 'offline';
}
