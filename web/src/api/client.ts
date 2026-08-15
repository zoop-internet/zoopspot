/**
 * Zoop API Client
 *
 * Calls the real Control Plane REST API (localhost:8080).
 * Signs authenticated requests using WebCrypto Ed25519 keys.
 */

import { buildSignedAuthHeaders } from './identity';

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

export async function getDevice(deviceId: string): Promise<ApiDevice> {
  const path = `/v1/devices/${deviceId}`;
  const authHeaders = await buildSignedAuthHeaders('GET', path);
  return apiFetch<ApiDevice>(path, {
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
