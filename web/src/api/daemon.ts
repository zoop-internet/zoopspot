/**
 * Zoop Local Daemon Client
 *
 * Talks to the local zoopd daemon API (127.0.0.1:9090/api/*). This is the
 * single source of truth for live tunnel state, telemetry, and WireGuard
 * peers on this machine. If the daemon isn't running, every call fails fast
 * so the UI can fall back to remote (cloud-only) mode.
 */

const DAEMON_BASE = (import.meta.env.VITE_DAEMON_BASE as string | undefined) ?? 'http://127.0.0.1:9090';

// Helper to detect mixed-content block when page is https but daemon is http-only
function isMixedContentError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes('Mixed Content') || msg.includes('blocked');
}

export interface DaemonStatus {
  running: boolean;
  endpoint_id: string;
  device_name: string;
  wireguard_public_key: string;
  listen_port: number;
  cloud_reachable: boolean;
  config_dir: string;
  active_tunnels: number;
  daemon_version: string;
}

export interface DaemonPeer {
  id: string;
  name: string;
  status: string;
  virtual_ip?: string;
  is_provider: boolean;
  online: boolean;
  connected: boolean;
  latency_ms: number;
  rx_bytes: number;
  tx_bytes: number;
  last_handshake_sec?: number;
}

export interface DaemonTelemetryEntry {
  connection_id: string;
  state: string;
  latency_ms: number;
  rx_bytes: number;
  tx_bytes: number;
  endpoint?: string;
  last_handshake_sec?: number;
}

export interface DaemonDiagnosticCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DaemonDiagnostics {
  timestamp: string;
  healthy: boolean;
  checks: DaemonDiagnosticCheck[];
}

export interface DaemonSettings {
  device_name: string;
  mtu: number;
  log_level: string;
}

export interface DaemonStreamSnapshot {
  timestamp: string;
  active_tunnels: number;
  telemetry: DaemonTelemetryEntry[];
}

async function daemonFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${DAEMON_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`daemon error ${res.status}: ${body}`);
  }
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

/** Probes the local daemon health endpoint. Resolves true if a daemon is up. */
export async function probeDaemon(timeoutMs = 1500): Promise<boolean> {
  // On https pages the daemon's plain-http is blocked as mixed-content — return false fast with hint
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && DAEMON_BASE.startsWith('http://')) {
    // Still try, but catch will handle the block
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${DAEMON_BASE}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (err) {
    if (isMixedContentError(err) && typeof console !== 'undefined') {
      console.warn('[zoop] Daemon probe blocked by mixed-content (page is https, daemon is http). Use http://localhost:5173 for local daemon or set VITE_DAEMON_BASE to an https tunnel.');
    }
    return false;
  }
}

export function isDaemonMixedContentBlocked(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' && DAEMON_BASE.startsWith('http://');
}

export function getDaemonStatus(): Promise<DaemonStatus> {
  return daemonFetch<DaemonStatus>('/api/status');
}

export function getDaemonPeers(): Promise<DaemonPeer[]> {
  return daemonFetch<DaemonPeer[]>('/api/peers');
}

export function getDaemonTelemetry(): Promise<DaemonTelemetryEntry[]> {
  return daemonFetch<DaemonTelemetryEntry[]>('/api/telemetry');
}

export function getDaemonDiagnostics(): Promise<DaemonDiagnostics> {
  return daemonFetch<DaemonDiagnostics>('/api/diagnostics');
}

export function getDaemonSettings(): Promise<DaemonSettings> {
  return daemonFetch<DaemonSettings>('/api/settings');
}

export function daemonConnect(peerId: string): Promise<unknown> {
  return daemonFetch<unknown>('/api/connect', {
    method: 'POST',
    body: JSON.stringify({ peer_id: peerId }),
  });
}

export function daemonDisconnect(connectionId: string): Promise<unknown> {
  return daemonFetch<unknown>('/api/disconnect', {
    method: 'POST',
    body: JSON.stringify({ connection_id: connectionId }),
  });
}

/**
 * Subscribes to the daemon's live SSE stream (2s heartbeat updates). Returns
 * a cleanup function. The daemon requires no auth (localhost-only binding).
 */
export function subscribeToDaemonStream(
  onSnapshot: (snap: DaemonStreamSnapshot) => void,
  onError: (err: unknown) => void,
): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const res = await fetch(`${DAEMON_BASE}/api/stream`, { signal: controller.signal });
      if (!res.ok || !res.body) throw new Error(`daemon stream failed: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) throw new Error('daemon stream closed');
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            onSnapshot(JSON.parse(dataLine.slice(5).trim()) as DaemonStreamSnapshot);
          } catch {
            // ignore malformed events
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  })();
  return () => controller.abort();
}