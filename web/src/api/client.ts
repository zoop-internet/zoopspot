/**
 * Zoop API Client
 *
 * Calls the real Control Plane REST API. The base is configurable at build time:
 * - VITE_API_BASE set → points at that origin (e.g. a deployed control plane).
 * - Otherwise defaults to '/api', which Vite proxies to the local control plane.
 * Signs authenticated requests using WebCrypto Ed25519 keys.
 */

import { buildSignedAuthHeaders, NotAuthenticatedError } from './identity';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export { NotAuthenticatedError };

// ─── Types matching the Go API ────────────────────────────────
export interface ApiDevice {
  id: string;
  endpoint_id?: string;
  name: string;
  platform: string;
  os?: string;
  capabilities: string[];
  status: string;
  public_key?: string;
  wireguard_public_key?: string;
  assigned_ip?: string;
}

export interface ApiShare {
  id: string;
  provider_id: string;
  recipient_id: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
}

export interface ApiConnection {
  id: string;
  provider_id: string;
  recipient_id: string;
  state: string;
  provider_ip?: string;
  recipient_ip?: string;
}

export interface ApiEndpoints {
  device_id: string;
  public_key: string;
  wireguard_public_key?: string;
}

export interface ApiOrg {
  id: string;
  name: string;
  owner_device_id?: string;
  slug?: string;
  status?: string;
}

export interface ApiOrgMember {
  id: string;
  organization_id: string;
  device_id?: string;
  name: string;
  email?: string; // deprecated optional — Zoop prefers username/zoop_id (docs/identity.md §7)
  username?: string; // @handle
  zoop_id?: string; // ZP-... permanent identity
  role: string;
  status: string;
}

export interface RegisterDeviceRequest {
  name: string;
  platform: string;
  public_key: string;
  wireguard_public_key?: string;
  capabilities: string[];
}

// ─── Http helpers ─────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
      else if (body?.message) message = body.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(message);
  }

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ─── Device operations ────────────────────────────────────────

export async function registerDevice(req: RegisterDeviceRequest): Promise<ApiDevice> {
  return apiFetch<ApiDevice>('/v1/devices', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listDevices(): Promise<ApiDevice[]> {
  try {
    const path = '/v1/devices';
    const authHeaders = await buildSignedAuthHeaders('GET', path);
    return await apiFetch<ApiDevice[]>(path, { headers: authHeaders });
  } catch (err) {
    if (err instanceof NotAuthenticatedError) {
      // No identity yet — return empty until device is registered
      return [];
    }
    throw err;
  }
}

export async function getDevice(deviceId: string): Promise<ApiDevice> {
  const path = `/v1/devices/${deviceId}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiDevice>(path, {
    headers: authHeaders,
  });
}

export async function unregisterDevice(deviceId: string): Promise<void> {
  const path = `/v1/devices/${deviceId}`;
  const authHeaders = await buildSignedAuthHeaders('DELETE', path);
  await apiFetch<void>(path, {
    method: 'DELETE',
    headers: authHeaders,
  });
}

export async function getDeviceEndpoints(deviceId: string): Promise<ApiEndpoints> {
  const path = `/v1/devices/${deviceId}/endpoints`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiEndpoints>(path, {
    headers: authHeaders,
  });
}

export async function getPendingConnections(deviceId: string): Promise<ApiConnection[]> {
  const path = `/v1/devices/${deviceId}/connections/pending`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiConnection[]>(path, {
    headers: authHeaders,
  });
}

export async function listConnections(): Promise<ApiConnection[]> {
  const path = '/v1/connections';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiConnection[]>(path, {
    headers: authHeaders,
  });
}

export async function listShares(): Promise<ApiShare[]> {
  const path = '/v1/shares';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiShare[]>(path, {
    headers: authHeaders,
  });
}

// ─── Organization operations ──────────────────────────────────

export async function createOrganization(name: string, slug?: string): Promise<ApiOrg> {
  const path = '/v1/organizations';
  const body = JSON.stringify({ name, slug });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiOrg>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function listOrganizations(): Promise<ApiOrg[]> {
  const path = '/v1/organizations';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiOrg[]>(path, { headers: authHeaders });
}

export async function getOrganization(orgId: string): Promise<ApiOrg> {
  const path = `/v1/organizations/${orgId}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiOrg>(path, { headers: authHeaders });
}

export async function addOrgMember(orgId: string, name: string, handle: string, role: string, deviceId?: string): Promise<ApiOrgMember> {
  // handle is Zoop ID (ZP-...) or @username — sent as username/zoop_id, with legacy email placeholder
  const isZoopId = /^ZP-[A-Z0-9]{4,}$/i.test(handle.trim());
  const payload: Record<string, string> = { name, role };
  if (deviceId) (payload as any).device_id = deviceId;
  if (isZoopId) {
    payload.zoop_id = handle.trim();
    payload.email = `${handle.trim().toLowerCase()}@zoop.local`; // legacy compat placeholder
  } else if (handle.includes('@') && handle.includes('.')) {
    // legacy email still accepted — forward as email + username
    payload.email = handle.trim();
    payload.username = handle.split('@')[0].replace(/^@/, '');
  } else {
    const username = handle.trim().replace(/^@/, '');
    payload.username = username;
    payload.email = `${username.toLowerCase()}@zoop.local`; // placeholder for storage NOT NULL
  }
  const path = `/v1/organizations/${orgId}/members`;
  const body = JSON.stringify(payload);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiOrgMember>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function listOrgMembers(orgId: string): Promise<ApiOrgMember[]> {
  const path = `/v1/organizations/${orgId}/members`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiOrgMember[]>(path, { headers: authHeaders });
}

export async function removeOrgMember(orgId: string, memberId: string): Promise<void> {
  const path = `/v1/organizations/${orgId}/members/${memberId}`;
  const authHeaders = await buildSignedAuthHeaders('DELETE', path);
  await apiFetch<void>(path, { method: 'DELETE', headers: authHeaders });
}

// ─── Admin operations (operator console) ─────────────────────

export async function adminListOrganizations(): Promise<ApiOrg[]> {
  const path = '/v1/admin/organizations';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiOrg[]>(path, { headers: authHeaders });
}

export async function adminListOrgMembers(orgId: string): Promise<ApiOrgMember[]> {
  const path = `/v1/admin/organizations/${orgId}/members`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiOrgMember[]>(path, { headers: authHeaders });
}

export async function adminListConnections(): Promise<ApiConnection[]> {
  const path = '/v1/admin/connections';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiConnection[]>(path, { headers: authHeaders });
}

export interface ApiServiceHealth {
  status: string;
  details?: Record<string, unknown>;
}

export async function adminServices(): Promise<Record<string, ApiServiceHealth>> {
  const path = '/v1/admin/services';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<Record<string, ApiServiceHealth>>(path, { headers: authHeaders });
}

export interface ApiAdminUser {
  id: string;
  name: string;
  email?: string; // deprecated optional — may be placeholder
  username?: string;
  zoop_id?: string;
  role: string;
  status: string;
  device_id?: string;
  organization_id: string;
}

export interface ApiNetworkUsage {
  pool: string;
  subnets_allocated: number;
  capacity: number;
  utilization_pct: number;
}

export interface ApiAuditEvent {
  id: string;
  actor_id: string;
  action: string;
  target_id: string;
  metadata?: string;
  timestamp: string;
  signature: string;
}

export interface ApiUsage {
  devices: number;
  trusted_devices: number;
  suspended_devices?: number;
  revoked_devices?: number;
  organizations: number;
  members: number;
  shares: number;
  connections: number;
  connections_by_state: Record<string, number>;
  bandwidth?: { bytes_in: number; bytes_out: number; total: number; active_sessions: number };
  ipam?: { pool: string; subnets_allocated: number; capacity: number; utilization_pct: number };
  timeseries?: Array<{ date: string; new_devices: number; new_connections: number; new_members: number; new_shares: number; cum_devices: number; cum_connections: number }>;
  range_days?: number;
  trends?: { devices_growth_pct: number; connections_growth_pct: number };
  top_orgs?: Array<{ id: string; name: string; slug?: string; members: number; devices: number; connections: number; share_pct: number }>;
  audit_summary?: { last_7_days: number; by_action: Record<string, number> };
  quotas?: { device_limit: number; devices_used_pct: number; ipam_warning: number; ipam_critical: number; ipam_pct: number; bandwidth_cap_per_session: number };
  generated_at?: string;
}

export async function adminUsers(): Promise<ApiAdminUser[]> {
  const path = '/v1/admin/users';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiAdminUser[]>(path, { headers: authHeaders });
}

export async function adminNetwork(): Promise<ApiNetworkUsage> {
  const path = '/v1/admin/network';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiNetworkUsage>(path, { headers: authHeaders });
}

export async function adminAudit(): Promise<ApiAuditEvent[]> {
  const path = '/v1/admin/audit';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiAuditEvent[]>(path, { headers: authHeaders });
}

export async function adminUsage(rangeDays: number = 30): Promise<ApiUsage> {
  const basePath = '/v1/admin/usage';
  const path = rangeDays ? `${basePath}?range=${rangeDays}` : basePath;
  const authHeaders = await buildSignedAuthHeaders('GET', basePath);
  return apiFetch<ApiUsage>(path, { headers: authHeaders });
}

export async function adminUsageCsv(rangeDays: number = 30): Promise<Blob> {
  const basePath = '/v1/admin/usage';
  const path = `${basePath}?range=${rangeDays}&format=csv`;
  const authHeaders = await buildSignedAuthHeaders('GET', basePath);
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders as Record<string, string> });
  if (!res.ok) throw new Error(`CSV export failed (${res.status})`);
  return await res.blob();
}

export async function adminRelays(): Promise<unknown[]> {
  const path = '/v1/admin/relays';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<unknown[]>(path, { headers: authHeaders });
}

export interface ApiRelayAddRequest {
  id: string;
  region: string;
  host: string;
  port?: number;
  websocket_url?: string;
  stun_port?: number;
  turn_port?: number;
  max_capacity?: number;
}

export async function adminAddRelay(req: ApiRelayAddRequest): Promise<unknown> {
  const path = '/v1/admin/relays';
  const body = JSON.stringify(req);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<unknown>(path, { method: 'POST', headers: authHeaders, body });
}

export async function adminRemoveRelay(id: string): Promise<unknown> {
  const path = `/v1/admin/relays/${id}`;
  const authHeaders = await buildSignedAuthHeaders('DELETE', path);
  return apiFetch<unknown>(path, { method: 'DELETE', headers: authHeaders });
}

export async function adminRevokeDevice(id: string): Promise<unknown> {
  const path = `/v1/admin/devices/${id}/revoke`;
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch(path, { method: 'POST', headers: authHeaders });
}

export async function adminSuspendDevice(id: string): Promise<unknown> {
  const path = `/v1/admin/devices/${id}/suspend`;
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch(path, { method: 'POST', headers: authHeaders });
}

export async function adminRestoreDevice(id: string): Promise<unknown> {
  const path = `/v1/admin/devices/${id}/restore`;
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch(path, { method: 'POST', headers: authHeaders });
}

// ─── Share operations ─────────────────────────────────────────

export async function createShare(authDeviceId: string, recipientId: string): Promise<ApiShare> {
  const path = '/v1/shares';
  const body = JSON.stringify({ provider_id: authDeviceId, recipient_id: recipientId });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiShare>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function getShare(shareId: string): Promise<ApiShare> {
  const path = `/v1/shares/${shareId}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiShare>(path, {
    headers: authHeaders,
  });
}

export async function deleteShare(shareId: string): Promise<void> {
  const path = `/v1/shares/${shareId}`;
  const authHeaders = await buildSignedAuthHeaders('DELETE', path);
  await apiFetch<void>(path, { method: 'DELETE', headers: authHeaders });
}

// ─── Connection operations ────────────────────────────────────

export async function createConnection(providerId: string, recipientId: string): Promise<ApiConnection> {
  const path = '/v1/connections';
  const body = JSON.stringify({ provider_id: providerId, recipient_id: recipientId });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiConnection>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function getConnection(connId: string): Promise<ApiConnection> {
  const path = `/v1/connections/${connId}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiConnection>(path, {
    headers: authHeaders,
  });
}

export async function updateConnectionState(connId: string, state: string): Promise<void> {
  const path = `/v1/connections/${connId}/state`;
  const body = JSON.stringify({ state });
  const authHeaders = await buildSignedAuthHeaders('PUT', path, body);
  await apiFetch<void>(path, {
    method: 'PUT',
    headers: authHeaders,
    body,
  });
}

// ─── Real-time events (Server-Sent Events) ────────────────────

export interface ServerEvent {
  type: string;
  entity?: string;
  id?: string;
  payload?: unknown;
}

/**
 * Subscribes to the control plane's SSE event stream using the caller's
 * authenticated identity. Returns a cleanup function. Because EventSource
 * cannot attach custom auth headers, the stream is read via fetch + reader.
 */
export async function subscribeToEvents(
  onEvent: (ev: ServerEvent) => void,
  onError: (err: unknown) => void,
): Promise<() => void> {
  const path = '/v1/events';
  const authHeaders = await buildSignedAuthHeaders('GET', path);

  const controller = new AbortController();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders,
    signal: controller.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`SSE subscribe failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const pump = async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          onError(new Error('Event stream closed'));
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            onEvent(JSON.parse(dataLine.slice(5).trim()) as ServerEvent);
          } catch {
            // ignore malformed events
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  };
  void pump();

  return () => controller.abort();
}
