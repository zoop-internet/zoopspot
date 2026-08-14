import type { DeviceIdentity, SharingPolicy, RelayNodeStatus, OrgMember, OrgTeam, OrgSubnet, AuditLogEntry } from '../types';

const API_BASE = 'http://localhost:8080/v1';

// Initial Mock Seed data representing realistic network endpoints
export const INITIAL_DEVICES: DeviceIdentity[] = [
  {
    id: 'd-macbook-pro-m3',
    name: 'MacBook Pro M3 Max',
    type: 'laptop',
    platform: 'darwin',
    publicKey: 'aBcD1234eFgH5678iJkL9012mNoP3456qRsT7890uVw=',
    wireguardPublicKey: 'wG+kEy1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ0=',
    assignedIP: '100.64.0.12',
    localIPs: ['192.168.1.145', 'fe80::1a2b:3c4d:5e6f'],
    publicIP: '198.51.100.42',
    isProvider: false,
    providerEnabled: false,
    status: 'online',
    lastSeen: 'Just now',
    version: 'zoop/v0.1.0-linux-amd64',
  },
  {
    id: 'd-home-gateway-rt',
    name: 'Home Fiber Gateway (OpenWrt)',
    type: 'router',
    platform: 'openwrt',
    publicKey: 'rT+xYz9876543210AbCdEfGhIjKlMnOpQrStUvWxYz1=',
    wireguardPublicKey: 'gW/hOmE9876543210zYxWvUtSrQpOnMlKjIhGfEdCbA=',
    assignedIP: '100.64.0.1',
    localIPs: ['192.168.1.1', '10.0.0.1'],
    publicIP: '203.0.113.88',
    isProvider: true,
    providerEnabled: true,
    status: 'online',
    lastSeen: 'Active (3 peers)',
    version: 'zoop-router/v0.1.0-openwrt',
  },
  {
    id: 'd-pixel-8-pro',
    name: 'Pixel 8 Pro (5G Cellular)',
    type: 'phone',
    platform: 'android',
    publicKey: 'pX/8Pr0987654321AbCdEfGhIjKlMnOpQrStUvWxYz2=',
    wireguardPublicKey: 'pX+wG9876543210zYxWvUtSrQpOnMlKjIhGfEdCbA2=',
    assignedIP: '100.64.0.24',
    localIPs: ['10.142.66.19'],
    publicIP: '172.56.21.99',
    isProvider: true,
    providerEnabled: true,
    status: 'online',
    lastSeen: 'Active',
    version: 'zoop-mobile/v0.1.0-android',
  },
  {
    id: 'd-aws-us-east-gw',
    name: 'AWS US-East VPC Transit Gateway',
    type: 'gateway',
    platform: 'linux',
    publicKey: 'aWs/UsE4stTr4ns1tGw9876543210zYxWvUtSrQpOnMl=',
    wireguardPublicKey: 'aWs+wGuS34st9876543210zYxWvUtSrQpOnMlKjIhGf=',
    assignedIP: '100.64.10.1',
    localIPs: ['172.31.0.4'],
    publicIP: '52.91.44.120',
    isProvider: true,
    providerEnabled: true,
    status: 'online',
    lastSeen: 'Active (14 peers)',
    version: 'zoop/v0.1.0-linux-amd64',
  },
];

export const INITIAL_SHARES: SharingPolicy[] = [
  {
    id: 'sh-family-fiber',
    providerDeviceId: 'd-home-gateway-rt',
    recipientIdentifier: 'alice@zoop.network',
    recipientName: 'Alice Johnson (Phone & Laptop)',
    status: 'active',
    maxBandwidthMbps: 100,
    maxDailyDataGB: 50,
    usedTodayBytes: 4.8 * 1024 * 1024 * 1024,
    allowLocalLANAccess: true,
    allowDNSForwarding: true,
    createdAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 'sh-mobile-hotspot',
    providerDeviceId: 'd-pixel-8-pro',
    recipientIdentifier: 'bob@zoop.network',
    recipientName: 'Bob Smith (Field Tech)',
    status: 'active',
    maxBandwidthMbps: 25,
    maxDailyDataGB: 5,
    usedTodayBytes: 840 * 1024 * 1024,
    allowLocalLANAccess: false,
    allowDNSForwarding: true,
    createdAt: '2026-08-12T09:15:00Z',
  },
];

export const INITIAL_RELAYS: RelayNodeStatus[] = [
  {
    id: 'relay-fra-1',
    name: 'Frankfurt Central 01',
    region: 'eu-central-de',
    location: 'Frankfurt, DE',
    endpoint: 'fra.relay.zoop.net:443',
    activeTunnels: 482,
    capacity: 2500,
    cpuLoadPercent: 24,
    memoryLoadPercent: 38,
    pingMs: 18,
    status: 'healthy',
  },
  {
    id: 'relay-iad-1',
    name: 'Ashburn East 01',
    region: 'us-east-va',
    location: 'Ashburn, VA, US',
    endpoint: 'iad.relay.zoop.net:443',
    activeTunnels: 814,
    capacity: 3000,
    cpuLoadPercent: 39,
    memoryLoadPercent: 51,
    pingMs: 29,
    status: 'healthy',
  },
  {
    id: 'relay-sin-1',
    name: 'Singapore Equinix 01',
    region: 'ap-southeast-sg',
    location: 'Singapore, SG',
    endpoint: 'sin.relay.zoop.net:443',
    activeTunnels: 310,
    capacity: 2000,
    cpuLoadPercent: 19,
    memoryLoadPercent: 31,
    pingMs: 142,
    status: 'healthy',
  },
  {
    id: 'relay-nrt-1',
    name: 'Tokyo Shinjuku 01',
    region: 'ap-northeast-jp',
    location: 'Tokyo, JP',
    endpoint: 'nrt.relay.zoop.net:443',
    activeTunnels: 245,
    capacity: 2000,
    cpuLoadPercent: 15,
    memoryLoadPercent: 28,
    pingMs: 168,
    status: 'healthy',
  },
];

export const INITIAL_ORG_MEMBERS: OrgMember[] = [
  {
    id: 'usr-sarah-chen',
    name: 'Sarah Chen (Lead NetOps)',
    email: 'sarah.chen@acme-corp.com',
    role: 'admin',
    devicesCount: 3,
    status: 'active',
    teams: ['Core Infra', 'Security'],
    lastActive: '2 mins ago',
  },
  {
    id: 'usr-david-ross',
    name: 'David Ross (Field Engineer)',
    email: 'd.ross@acme-corp.com',
    role: 'network_engineer',
    devicesCount: 2,
    status: 'active',
    teams: ['Field Ops'],
    lastActive: '14 mins ago',
  },
  {
    id: 'usr-elena-v',
    name: 'Elena Vance',
    email: 'elena@acme-corp.com',
    role: 'member',
    devicesCount: 1,
    status: 'active',
    teams: ['Product'],
    lastActive: '3 hours ago',
  },
];

export const INITIAL_ORG_TEAMS: OrgTeam[] = [
  {
    id: 'team-infra',
    name: 'Core Infrastructure',
    description: 'Direct routing to Production Gateways & Datacenters',
    memberCount: 6,
    assignedProviders: ['AWS US-East VPC Transit Gateway', 'Frankfurt DC Router'],
    egressRule: 'direct_preferred',
  },
  {
    id: 'team-field',
    name: 'Field Operations',
    description: 'Encrypted cellular mesh for field mobile technicians',
    memberCount: 14,
    assignedProviders: ['Home Fiber Gateway (OpenWrt)', 'Mobile Cellular Gateway'],
    egressRule: 'enforce_relay',
  },
];

export const INITIAL_ORG_SUBNETS: OrgSubnet[] = [
  {
    id: 'sub-iad-prod',
    cidr: '100.64.10.0/24',
    region: 'us-east-va',
    allocatedIPs: 38,
    totalIPs: 254,
    assignedGateway: 'AWS US-East VPC Transit Gateway',
  },
  {
    id: 'sub-fra-dev',
    cidr: '100.64.20.0/24',
    region: 'eu-central-de',
    allocatedIPs: 19,
    totalIPs: 254,
    assignedGateway: 'Frankfurt Lab Router',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-891',
    timestamp: '2026-08-14T11:22:15Z',
    actor: 'sarah.chen@acme-corp.com',
    action: 'POLICY_UPDATE',
    target: 'team-infra (Added AWS US-East VPC Transit Gateway)',
    status: 'success',
    ipAddress: '198.51.100.42',
    signature: 'ed25519:7f8a9b2c...3d4e',
  },
  {
    id: 'log-890',
    timestamp: '2026-08-14T10:45:00Z',
    actor: 'd-pixel-8-pro',
    action: 'PROVIDER_ACTIVATE',
    target: 'Cellular WAN Masquerade enabled',
    status: 'success',
    ipAddress: '172.56.21.99',
    signature: 'ed25519:9e8d7c6b...5a4f',
  },
  {
    id: 'log-889',
    timestamp: '2026-08-14T09:12:33Z',
    actor: 'unknown-device-attempt',
    action: 'UNAUTHORIZED_PEER_CONNECT',
    target: 'd-home-gateway-rt',
    status: 'denied',
    ipAddress: '45.154.255.12',
    signature: 'invalid_signature_rejected',
  },
];

// Helper to generate realistic Ed25519 and WireGuard keys
export function generateRandomKeys() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const gen = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '=';
  return {
    publicKey: gen(43),
    wireguardPublicKey: gen(43),
  };
}

// Client API wrapper with automatic fallback if Cloud API is not running
export class ZoopApiClient {
  private isOnlineBackend = false;

  constructor() {
    this.checkHealth();
  }

  private async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/devices/d-test`, { method: 'GET', signal: AbortSignal.timeout(1200) });
      this.isOnlineBackend = res.status !== 0;
    } catch {
      this.isOnlineBackend = false;
    }
  }

  isBackendOnline(): boolean {
    return this.isOnlineBackend;
  }

  async getDevices(): Promise<DeviceIdentity[]> {
    return INITIAL_DEVICES;
  }

  async registerDevice(data: Partial<DeviceIdentity>): Promise<DeviceIdentity> {
    const keys = generateRandomKeys();
    const newDev: DeviceIdentity = {
      id: `d-${data.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'device'}-${Math.floor(Math.random() * 1000)}`,
      name: data.name || 'New Endpoint',
      type: data.type || 'laptop',
      platform: data.platform || 'linux',
      publicKey: keys.publicKey,
      wireguardPublicKey: keys.wireguardPublicKey,
      assignedIP: `100.64.0.${Math.floor(Math.random() * 200) + 30}`,
      localIPs: ['192.168.1.100'],
      publicIP: '198.51.100.77',
      isProvider: Boolean(data.isProvider),
      providerEnabled: Boolean(data.providerEnabled),
      status: 'online',
      lastSeen: 'Just now',
      version: 'zoop/v0.1.0-linux-amd64',
    };
    return newDev;
  }

  async getShares(): Promise<SharingPolicy[]> {
    return INITIAL_SHARES;
  }

  async getRelays(): Promise<RelayNodeStatus[]> {
    return INITIAL_RELAYS;
  }
}

export const apiClient = new ZoopApiClient();
