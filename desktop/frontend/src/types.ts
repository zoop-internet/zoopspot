export interface DesktopSettings {
  auto_connect: boolean;
  kill_switch: boolean;
  allow_local_lan: boolean;
  dns_servers: string[];
  control_plane_url: string;
  device_name: string;
  tunnel_if_name: string;
}

export interface DesktopPeerInfo {
  id: string;
  name: string;
  platform: string;
  virtual_ip: string;
  is_provider: boolean;
  online: boolean;
  latency_ms: number;
  direct_available: boolean;
  country: string;
  city: string;
}

export interface DesktopStatus {
  connected: boolean;
  state: 'idle' | 'connecting' | 'connected' | 'error';
  assigned_ip: string;
  public_ip: string;
  tunnel_if_name: string;
  active_peer_id?: string;
  active_peer_name?: string;
  connected_since?: string;
  version: string;
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
