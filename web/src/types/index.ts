export type PortalMode = 'landing' | 'user' | 'org' | 'admin' | 'auth';

export interface UserProfile {
  id: string; // Zoop ID e.g. ZP-7K4M9X (per docs/identity.md §2)
  zoopId: string; // permanent platform identity, same as id for clarity
  username: string; // human-readable handle without @ prefix, e.g. "alex" (@alex)
  name: string; // display name
  email?: string; // deprecated — Zoop does not require email (identity.md §3, §7). Kept optional for legacy compat.
  avatar?: string;
  plan?: 'free' | 'pro' | 'business' | 'enterprise';
  role?: string;
  createdAt?: string;
}

export type DeviceType = 'desktop' | 'laptop' | 'phone' | 'router' | 'server' | 'gateway';
export type DevicePlatform = 'linux' | 'darwin' | 'windows' | 'android' | 'ios' | 'openwrt';
export type ConnectionState = 'idle' | 'discovering' | 'signaling' | 'punching_nat' | 'connected_direct' | 'connected_relay' | 'failed' | 'reconnecting';
export type RelayRegion = 'us-east-va' | 'us-west-or' | 'eu-central-de' | 'ap-southeast-sg' | 'ap-northeast-jp';

export interface DeviceIdentity {
  id: string;
  name: string;
  type: DeviceType;
  platform: DevicePlatform;
  publicKey: string;
  wireguardPublicKey: string;
  assignedIP: string;
  localIPs: string[];
  publicIP?: string;
  isProvider: boolean;
  providerEnabled: boolean;
  status: 'online' | 'offline' | 'busy';
  lastSeen: string;
  version: string;
}

export interface NetworkTelemetry {
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  bytesIn: number;
  bytesOut: number;
  bandwidthInBps: number;
  bandwidthOutBps: number;
  currentPath: 'direct' | 'relay' | 'local_lan';
  relayNode?: string;
  natType: 'Open Internet' | 'Full Cone' | 'Restricted Cone' | 'Port Restricted' | 'Symmetric NAT';
  cipherSuite: string;
}

export interface ConnectionSession {
  id: string;
  providerId: string;
  providerName: string;
  providerIP: string;
  recipientId: string;
  recipientName: string;
  recipientIP: string;
  state: ConnectionState;
  pathType: 'direct' | 'relay';
  relayRegion?: RelayRegion;
  tunnelInterface: string;
  establishedAt: string;
  durationSeconds: number;
  telemetry: NetworkTelemetry;
  dnsServers: string[];
  allowedIPs: string[];
}

export interface SharingPolicy {
  id: string;
  providerDeviceId: string;
  recipientIdentifier: string; // Zoop ID (ZP-...) or @username or Device ID — never email (identity.md §2, §7)
  recipientName: string;
  status: 'active' | 'pending' | 'revoked';
  maxBandwidthMbps?: number;
  maxDailyDataGB?: number;
  usedTodayBytes: number;
  allowLocalLANAccess: boolean;
  allowDNSForwarding: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface OrgMember {
  id: string;
  name: string;
  zoopId?: string; // ZP-... permanent identity (identity.md §2) — preferred identifier
  username?: string; // @handle (identity.md §2) — preferred human identifier
  email?: string; // deprecated optional — Zoop does not require email (identity.md §7)
  role: 'owner' | 'admin' | 'network_engineer' | 'member';
  devicesCount: number;
  status: 'active' | 'invited' | 'suspended';
  teams: string[];
  lastActive: string;
}

export interface OrgTeam {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  assignedProviders: string[];
  egressRule: 'direct_preferred' | 'enforce_relay' | 'isolated';
}

export interface OrgSubnet {
  id: string;
  cidr: string;
  region: string;
  allocatedIPs: number;
  totalIPs: number;
  assignedGateway: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: 'success' | 'denied' | 'error';
  ipAddress: string;
  signature: string;
}

export interface RelayNodeStatus {
  id: string;
  name: string;
  region: RelayRegion;
  location: string;
  endpoint: string;
  activeTunnels: number;
  capacity: number;
  cpuLoadPercent: number;
  memoryLoadPercent: number;
  pingMs: number;
  status: 'healthy' | 'degraded' | 'maintenance';
}

export interface ApiWallet {
  id: string;
  endpoint_id: string;
  currency: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  unwithdrawn_earnings: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPaymentTransaction {
  id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'usage';
  amount: number;
  currency: string;
  fee: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  reference_id: string;
  gateway_reference?: string;
  phone_number?: string;
  provider?: string;
  description?: string;
  redirect_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiEarningRecord {
  id: string;
  wallet_id: string;
  peer_endpoint_id: string;
  source: 'bandwidth_relay' | 'exit_node' | 'referral' | 'bonus';
  bytes_served: number;
  duration_seconds: number;
  amount: number;
  currency: string;
  recorded_at: string;
}
