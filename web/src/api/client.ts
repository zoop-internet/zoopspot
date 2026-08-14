/**
 * Zoop API Client
 *
 * Calls the real Control Plane REST API (localhost:8080).
 * No mock data — if the backend is down, operations will fail gracefully.
 */

const API_BASE = '/api'; // proxied via vite to http://localhost:8080

// ─── Types matching the Go API ────────────────────────────────
export interface ApiDevice {
  id: string;
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
  status: string;
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
}

export interface ApiOrgMember {
  id: string;
  organization_id: string;
  name: string;
  email: string;
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

type AuthHeaders = { 'X-Zoop-Device-ID': string; 'X-Zoop-Signature': string; 'X-Zoop-Timestamp': string };

function buildAuthHeaders(deviceId: string): AuthHeaders {
  // For development — device ID only. Real signature implementation
  // goes here when Ed25519 key is available.
  const ts = Math.floor(Date.now() / 1000).toString();
  return {
    'X-Zoop-Device-ID': deviceId,
    'X-Zoop-Signature': 'dev-placeholder',
    'X-Zoop-Timestamp': ts,
  };
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
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
  return apiFetch<ApiDevice[]>('/v1/devices');
}

export async function getDevice(deviceId: string, authDeviceId: string): Promise<ApiDevice> {
  return apiFetch<ApiDevice>(`/v1/devices/${deviceId}`, {
    headers: buildAuthHeaders(authDeviceId),
  });
}

export async function getDeviceEndpoints(deviceId: string, authDeviceId: string): Promise<ApiEndpoints> {
  return apiFetch<ApiEndpoints>(`/v1/devices/${deviceId}/endpoints`, {
    headers: buildAuthHeaders(authDeviceId),
  });
}

export async function getPendingConnections(deviceId: string): Promise<ApiConnection[]> {
  return apiFetch<ApiConnection[]>(`/v1/devices/${deviceId}/connections/pending`, {
    headers: buildAuthHeaders(deviceId),
  });
}

// ─── Organization operations ──────────────────────────────────

export async function createOrganization(name: string): Promise<ApiOrg> {
  return apiFetch<ApiOrg>('/v1/organizations', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function listOrganizations(): Promise<ApiOrg[]> {
  return apiFetch<ApiOrg[]>('/v1/organizations');
}

export async function getOrganization(orgId: string): Promise<ApiOrg> {
  return apiFetch<ApiOrg>(`/v1/organizations/${orgId}`);
}

export async function addOrgMember(orgId: string, name: string, email: string, role: string): Promise<ApiOrgMember> {
  return apiFetch<ApiOrgMember>(`/v1/organizations/${orgId}/members`, {
    method: 'POST',
    body: JSON.stringify({ name, email, role }),
  });
}

export async function listOrgMembers(orgId: string): Promise<ApiOrgMember[]> {
  return apiFetch<ApiOrgMember[]>(`/v1/organizations/${orgId}/members`);
}

// ─── Share operations ─────────────────────────────────────────

export async function createShare(authDeviceId: string, recipientId: string): Promise<ApiShare> {
  return apiFetch<ApiShare>('/v1/shares', {
    method: 'POST',
    headers: buildAuthHeaders(authDeviceId),
    body: JSON.stringify({ provider_id: authDeviceId, recipient_id: recipientId }),
  });
}

export async function getShare(shareId: string, authDeviceId: string): Promise<ApiShare> {
  return apiFetch<ApiShare>(`/v1/shares/${shareId}`, {
    headers: buildAuthHeaders(authDeviceId),
  });
}

// ─── Connection operations ────────────────────────────────────

export async function createConnection(authDeviceId: string, providerId: string, shareId: string): Promise<ApiConnection> {
  return apiFetch<ApiConnection>('/v1/connections', {
    method: 'POST',
    headers: buildAuthHeaders(authDeviceId),
    body: JSON.stringify({ provider_id: providerId, share_id: shareId }),
  });
}

export async function getConnection(connId: string, authDeviceId: string): Promise<ApiConnection> {
  return apiFetch<ApiConnection>(`/v1/connections/${connId}`, {
    headers: buildAuthHeaders(authDeviceId),
  });
}

export async function updateConnectionState(connId: string, authDeviceId: string, state: string): Promise<void> {
  await apiFetch<void>(`/v1/connections/${connId}/state`, {
    method: 'PUT',
    headers: buildAuthHeaders(authDeviceId),
    body: JSON.stringify({ state }),
  });
}
