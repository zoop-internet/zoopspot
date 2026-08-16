export interface DesktopSettings {
  auto_connect: boolean;
  kill_switch: boolean;
  allow_local_lan: boolean;
  split_tunnel: boolean;
  dns_servers: string[];
  control_plane_url: string;
  device_name: string;
  tunnel_if_name: string;
  theme_accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  max_sharing_bandwidth_mbps: number;
}

export interface DesktopPeerInfo {
  id: string;
  name: string;
  platform: 'linux' | 'darwin' | 'windows' | 'android' | 'ios' | 'openwrt';
  virtual_ip: string;
  public_key?: string;
  endpoint?: string;
  is_provider: boolean;
  online: boolean;
  latency_ms: number;
  direct_available: boolean;
  country: string;
  city: string;
  rx_bytes?: number;
  tx_bytes?: number;
  last_seen?: string;
}

export interface DesktopStatus {
  connected: boolean;
  state: 'idle' | 'connecting' | 'connected' | 'error';
  assigned_ip: string;
  public_ip: string;
  tunnel_if_name: string;
  active_peer_id?: string;
  active_peer_name?: string;
  active_peer_ip?: string;
  connected_since?: string;
  version: string;
  identity_fingerprint?: string;
}

export interface DesktopTelemetry {
  download_rate_kbps: number;
  upload_rate_kbps: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
  latency_ms: number;
  packet_loss_pct: number;
  path_type: 'direct' | 'relay' | 'none';
  nat_type: string;
}

export interface TelemetryPoint {
  timestamp: number;
  download_kbps: number;
  upload_kbps: number;
  latency_ms: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'connect' | 'disconnect' | 'relay' | 'direct' | 'share' | 'security' | 'network';
  title: string;
  description: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface DiagnosticCheckItem {
  name: string;
  passed: boolean;
  latency_ms: number;
  message: string;
  details?: string;
}

export interface DesktopDiagnosticsReport {
  healthy: boolean;
  checks: DiagnosticCheckItem[];
  details: string[];
  diagnostic_time_rfc: string;
}

export interface UserIdentity {
  user_email: string;
  user_name: string;
  device_id: string;
  device_name: string;
  public_key: string;
  enrolled_at: string;
  security_state: 'secure' | 'reauth_required' | 'revoked';
}
