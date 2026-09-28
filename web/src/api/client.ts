/**
 * Zoop API Client
 *
 * Calls the real Control Plane REST API. The base is configurable at build time:
 * - VITE_API_BASE set → points at that origin (e.g. a deployed control plane).
 * - Otherwise defaults to '/api', which Vite proxies to the local control plane.
 * Signs authenticated requests using WebCrypto Ed25519 keys.
 */

import { buildSignedAuthHeaders, NotAuthenticatedError } from './identity';
import type { ApiWallet, ApiPaymentTransaction, ApiEarningRecord } from '../types';

const RAW_API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

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

export interface AuthSignupRequest {
  username: string;
  pin: string;
  name?: string;
  device_name: string;
  platform?: string;
  public_key: string;
  wireguard_public_key?: string;
}

export interface AuthLoginRequest {
  identifier: string;
  pin: string;
  device_name?: string;
  platform?: string;
  public_key: string;
  wireguard_public_key?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    zoop_id: string;
    username: string;
    name: string;
    created_at?: string;
  };
  device: ApiDevice;
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

// ─── Authentication operations ───────────────────────────────────

export async function apiAuthSignup(req: AuthSignupRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function apiAuthLogin(req: AuthLoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ─── Device operations ────────────────────────────────────────

export async function registerDevice(req: RegisterDeviceRequest): Promise<ApiDevice> {
  return apiFetch<ApiDevice>('/v1/devices', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listDevices(search?: string, limit: number = 100, offset: number = 0): Promise<ApiDevice[]> {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (limit !== 100) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    // sign base path without query (middleware signs path only)
    const basePath = '/v1/devices';
    const fullPath = `${basePath}${qs}`;
    const authHeaders = await buildSignedAuthHeaders('GET', basePath);
    return await apiFetch<ApiDevice[]>(fullPath, { headers: authHeaders });
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
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return apiFetch<ApiOrg>(path, {
    method: 'POST',
    headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
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
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return apiFetch<ApiShare>(path, {
    method: 'POST',
    headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
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
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return apiFetch<ApiConnection>(path, {
    method: 'POST',
    headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
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

// ─── Wallet & Payment operations ─────────────────────────────

export async function getWallet(): Promise<ApiWallet | null> {
  try {
    const path = '/v1/wallet';
    const authHeaders = await buildSignedAuthHeaders('GET', path);
    return await apiFetch<ApiWallet>(path, { headers: authHeaders });
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return null;
    throw err;
  }
}

export async function depositMobileMoney(
  amount: number,
  phoneNumber: string,
  provider: string,
  description?: string
): Promise<ApiPaymentTransaction> {
  const path = '/v1/wallet/deposit/mobile-money';
  const body = JSON.stringify({
    amount,
    phone_number: phoneNumber,
    provider,
    description: description || 'Mesh Top-up via Mobile Money',
  });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return await apiFetch<ApiPaymentTransaction>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function depositCard(
  amount: number,
  callbackUrl?: string,
  description?: string
): Promise<ApiPaymentTransaction> {
  const path = '/v1/wallet/deposit/card';
  const body = JSON.stringify({
    amount,
    callback_url: callbackUrl,
    description: description || 'Mesh Top-up via Card',
  });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return await apiFetch<ApiPaymentTransaction>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function withdraw(
  amount: number,
  phoneNumber: string,
  provider: string,
  description?: string
): Promise<ApiPaymentTransaction> {
  const path = '/v1/wallet/withdraw';
  const body = JSON.stringify({
    amount,
    phone_number: phoneNumber,
    provider,
    description: description || 'Earnings Payout',
  });
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return await apiFetch<ApiPaymentTransaction>(path, {
    method: 'POST',
    headers: authHeaders,
    body,
  });
}

export async function getWalletTransactions(
  limit: number = 20,
  offset: number = 0
): Promise<ApiPaymentTransaction[]> {
  try {
    const basePath = '/v1/wallet/transactions';
    const qs = `?limit=${limit}&offset=${offset}`;
    const authHeaders = await buildSignedAuthHeaders('GET', basePath);
    const res = await apiFetch<{ transactions: ApiPaymentTransaction[] }>(`${basePath}${qs}`, {
      headers: authHeaders,
    });
    return res?.transactions ?? [];
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return [];
    throw err;
  }
}

export async function getWalletEarnings(
  limit: number = 20,
  offset: number = 0
): Promise<ApiEarningRecord[]> {
  try {
    const basePath = '/v1/wallet/earnings';
    const qs = `?limit=${limit}&offset=${offset}`;
    const authHeaders = await buildSignedAuthHeaders('GET', basePath);
    const res = await apiFetch<{ earnings: ApiEarningRecord[] }>(`${basePath}${qs}`, {
      headers: authHeaders,
    });
    return res?.earnings ?? [];
  } catch (err) {
    if (err instanceof NotAuthenticatedError) return [];
    throw err;
  }
}

// ─── Admin Billing & System Operations ────────────────────────

export interface ApiBillingOverview {
  total_volume_ugx: number;
  total_deposits_ugx: number;
  total_withdrawals_ugx: number;
  active_wallets: number;
  total_transactions: number;
}

export interface ApiAdminBillingResponse {
  overview: ApiBillingOverview;
  transactions: ApiPaymentTransaction[];
  total: number;
}

export interface ApiSystemTelemetry {
  uptime_seconds: number;
  go_version: string;
  num_goroutines: number;
  memory_alloc_mb: number;
  memory_sys_mb: number;
  database: {
    max_open_connections: number;
    open_connections: number;
    in_use: number;
    idle: number;
    wait_count: number;
    wait_duration_ms: number;
  };
  services: Record<string, string>;
  active_connections: number;
  timestamp: string;
}

export async function adminBilling(limit: number = 50, offset: number = 0): Promise<ApiAdminBillingResponse> {
  const basePath = '/v1/admin/billing';
  const qs = `?limit=${limit}&offset=${offset}`;
  const authHeaders = await buildSignedAuthHeaders('GET', basePath);
  return apiFetch<ApiAdminBillingResponse>(`${basePath}${qs}`, { headers: authHeaders });
}

export async function adminBillingCsv(): Promise<Blob> {
  const basePath = '/v1/admin/billing/csv';
  const authHeaders = await buildSignedAuthHeaders('GET', basePath);
  const res = await fetch(`${API_BASE}${basePath}`, { headers: authHeaders as Record<string, string> });
  if (!res.ok) throw new Error(`CSV export failed (${res.status})`);
  return await res.blob();
}

export async function adminSystem(): Promise<ApiSystemTelemetry> {
  const path = '/v1/admin/system';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiSystemTelemetry>(path, { headers: authHeaders });
}

export async function adminFlushCache(): Promise<{ status: string; message: string; flushed_at: string }> {
  const path = '/v1/admin/cache/flush';
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch(path, { method: 'POST', headers: authHeaders });
}

export async function adminRestartStore(): Promise<{ status: string; message: string; verified_at: string; open_connections: number }> {
  const path = '/v1/admin/services/store/restart';
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch(path, { method: 'POST', headers: authHeaders });
}

export async function adminCreateIncident(req: { title: string; severity: string; description: string }): Promise<{ status: string; message: string; incident_id: string; logged_at: string }> {
  const path = '/v1/admin/incidents';
  const body = JSON.stringify(req);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch(path, { method: 'POST', headers: authHeaders, body });
}

export async function getOrgAudit(orgId: string): Promise<ApiAuditEvent[]> {
  const path = `/v1/organizations/${orgId}/audit`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiAuditEvent[]>(path, { headers: authHeaders });
}

// ─── Integrations (Admin) ────────────────────────────────────────────────────

export interface IntegrationConfig {
  payment_gateway_url: string;
  payment_api_key: string;      // masked on server
  payment_api_secret: string;   // masked on server
  payment_webhook_secret: string; // masked on server
  payment_currency: string;
  payment_mode: 'live' | 'mock';
  turn_secret: string;          // masked on server
  turn_realm: string;
  stun_server: string;
  database_host: string;
  database_status: 'connected' | 'disconnected';
}

export interface IntegrationUpdatePayload {
  payment_gateway_url?: string;
  payment_api_key?: string;
  payment_api_secret?: string;
  payment_webhook_secret?: string;
  payment_currency?: string;
  turn_secret?: string;
  turn_realm?: string;
  stun_server?: string;
}

export interface IntegrationTestResult {
  service: string;
  status: 'ok' | 'mock' | 'error';
  message: string;
  latency_ms?: string;
}

export async function adminGetIntegrations(): Promise<IntegrationConfig> {
  const path = '/v1/admin/integrations';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<IntegrationConfig>(path, { headers: authHeaders });
}

export async function adminUpdateIntegrations(
  payload: IntegrationUpdatePayload
): Promise<{ ok: boolean; updated: number; message: string }> {
  const path = '/v1/admin/integrations';
  const body = JSON.stringify(payload);
  const authHeaders = await buildSignedAuthHeaders('PUT', path, body);
  return apiFetch(path, { method: 'PUT', headers: authHeaders, body });
}

export async function adminTestIntegration(
  service: 'payment' | 'database' | 'turn'
): Promise<IntegrationTestResult> {
  const path = `/v1/admin/integrations/test?service=${service}`;
  const authHeaders = await buildSignedAuthHeaders('POST', path);
  return apiFetch<IntegrationTestResult>(path, { method: 'POST', headers: authHeaders });
}

// ─── Hotspot & Captive Portal Types ───────────────────────────

export interface ApiHotspot {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  location: string;
  router_type: 'mikrotik' | 'openwrt' | 'linux';
  router_ip: string;
  tunnel_ip?: string;
  currency: string;
  is_online: boolean;
  last_heartbeat?: string;
  created_at: string;
}

export interface ApiHotspotPackage {
  id: string;
  hotspot_id: string;
  name: string;
  price: number;
  currency?: string;
  duration_minutes: number;
  data_limit_bytes: number;
  rate_limit_down_kbps: number;
  rate_limit_up_kbps: number;
  is_active: boolean;
  created_at: string;
}

export interface ApiHotspotSession {
  id: string;
  hotspot_id: string;
  package_id?: string;
  phone_number?: string;
  mac_address: string;
  client_ip: string;
  status: 'pending' | 'active' | 'expired' | 'terminated';
  transaction_id?: string;
  voucher_code?: string;
  bytes_downloaded: number;
  bytes_uploaded: number;
  started_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface ApiHotspotVoucher {
  id: string;
  hotspot_id: string;
  package_id: string;
  code: string;
  batch_tag: string;
  is_claimed: boolean;
  claimed_by_mac?: string;
  claimed_at?: string;
  created_at: string;
}

export interface ApiHotspotStats {
  hotspot_id: string;
  active_sessions: number;
  total_sessions: number;
  revenue_today_ugx: number;
  total_revenue_ugx: number;
  bytes_today: number;
  total_vouchers: number;
  claimed_vouchers: number;
  total_bytes_down: number;
  total_bytes_up: number;
}

export interface PortalCheckoutPayload {
  hotspot_slug: string;
  package_id: string;
  phone_number: string;
  mac_address: string;
  client_ip?: string;
}

export interface PortalCheckoutResponse {
  session_id: string;
  transaction_id: string;
  status: 'pending' | 'active';
  amount: number;
  currency: string;
  message: string;
}

// ─── Public Captive Portal API ────────────────────────────────

export async function getPortalHotspot(slug: string): Promise<{
  hotspot: { id: string; name: string; slug: string; location: string; currency: string; is_online: boolean };
  packages: ApiHotspotPackage[];
}> {
  return apiFetch(`/v1/portal/hotspot/${encodeURIComponent(slug)}`);
}

export async function portalCheckout(data: PortalCheckoutPayload): Promise<PortalCheckoutResponse> {
  return apiFetch('/v1/portal/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function portalVoucher(data: {
  hotspot_slug: string;
  code: string;
  mac_address: string;
  client_ip?: string;
}): Promise<ApiHotspotSession> {
  return apiFetch('/v1/portal/voucher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function portalLifeline(data: {
  hotspot_slug: string;
  mac_address: string;
  client_ip?: string;
}): Promise<ApiHotspotSession> {
  return apiFetch('/v1/portal/lifeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getPortalSession(id: string): Promise<ApiHotspotSession> {
  return apiFetch(`/v1/portal/session/${encodeURIComponent(id)}`);
}

// ─── Operator Hotspot Fleet API ───────────────────────────────

export async function createHotspot(data: {
  name: string;
  slug?: string;
  location?: string;
  router_type?: string;
}): Promise<ApiHotspot> {
  const path = '/v1/hotspots';
  const body = JSON.stringify(data);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiHotspot>(path, { method: 'POST', headers: authHeaders, body });
}

export async function listHotspots(): Promise<{ hotspots: ApiHotspot[]; total: number }> {
  const path = '/v1/hotspots';
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<{ hotspots: ApiHotspot[]; total: number }>(path, { headers: authHeaders });
}

export async function getHotspot(id: string): Promise<ApiHotspot> {
  const path = `/v1/hotspots/${encodeURIComponent(id)}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiHotspot>(path, { headers: authHeaders });
}

export async function deleteHotspot(id: string): Promise<{ status: string }> {
  const path = `/v1/hotspots/${encodeURIComponent(id)}`;
  const authHeaders = await buildSignedAuthHeaders('DELETE', path);
  return apiFetch<{ status: string }>(path, { method: 'DELETE', headers: authHeaders });
}

export async function getHotspotScript(id: string): Promise<string> {
  const path = `/v1/hotspots/${encodeURIComponent(id)}/script`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Failed to fetch script: ${res.statusText}`);
  return res.text();
}

export async function createHotspotPackage(
  hotspotId: string,
  data: {
    name: string;
    price: number;
    duration_minutes: number;
    rate_down_kbps?: number;
    rate_up_kbps?: number;
  }
): Promise<ApiHotspotPackage> {
  const path = `/v1/hotspots/${encodeURIComponent(hotspotId)}/packages`;
  const body = JSON.stringify(data);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<ApiHotspotPackage>(path, { method: 'POST', headers: authHeaders, body });
}

export async function listHotspotPackages(
  hotspotId: string
): Promise<{ packages: ApiHotspotPackage[]; total: number }> {
  const path = `/v1/hotspots/${encodeURIComponent(hotspotId)}/packages`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<{ packages: ApiHotspotPackage[]; total: number }>(path, { headers: authHeaders });
}

export async function generateVouchers(
  hotspotId: string,
  data: { package_id: string; count: number; batch_tag?: string }
): Promise<{ vouchers: ApiHotspotVoucher[]; total: number }> {
  const path = `/v1/hotspots/${encodeURIComponent(hotspotId)}/vouchers`;
  const body = JSON.stringify(data);
  const authHeaders = await buildSignedAuthHeaders('POST', path, body);
  return apiFetch<{ vouchers: ApiHotspotVoucher[]; total: number }>(path, { method: 'POST', headers: authHeaders, body });
}

export async function listHotspotVouchers(
  hotspotId: string,
  limit = 50,
  offset = 0
): Promise<{ vouchers: ApiHotspotVoucher[]; total: number; limit: number; offset: number }> {
  const path = `/v1/hotspots/${encodeURIComponent(hotspotId)}/vouchers?limit=${limit}&offset=${offset}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch(path, { headers: authHeaders });
}

export async function getHotspotStats(hotspotId: string): Promise<ApiHotspotStats> {
  const path = `/v1/hotspots/${encodeURIComponent(hotspotId)}/stats`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiHotspotStats>(path, { headers: authHeaders });
}

