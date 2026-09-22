/**
 * Local identity & device registration for the web app.
 *
 * The web app creates a real self-signed Ed25519 keypair using the Web Cryptography API.
 * The public key (32-byte raw Ed25519) is registered with the Control Plane.
 * The private key (PKCS8) is preserved in storage/memory for signing authenticated API calls.
 */

import type { UserProfile } from '../types';

const USER_PROFILE_KEY = 'zoop:web:user_profile';
const IDENTITY_KEY = 'zoop:web:device_id';
const ENDPOINT_KEY = 'zoop:web:endpoint_id';
const NAME_KEY = 'zoop:web:device_name';
const PRIV_KEY = 'zoop:web:priv_key';
const PUB_KEY = 'zoop:web:pub_key';
const SHARED_COOKIE_NAME = 'zoop_session';

let cachedPrivateKey: CryptoKey | null = null;

export function utf8ToBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch {
    return btoa(str);
  }
}

export function base64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(Array.from(atob(b64)).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
  } catch {
    return atob(b64);
  }
}

function setSharedCookie(name: string, value: string, days = 30): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const host = window.location.hostname;
  const isZoopDomain = host.endsWith('zoopnetwork.app') || host.endsWith('zoopinternet.app');
  const domainPart = isZoopDomain ? `; domain=.${host.split('.').slice(-2).join('.')}` : '';
  const securePart = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${domainPart}${securePart}`;
}

function getSharedCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function clearSharedCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const isZoopDomain = host.endsWith('zoopnetwork.app') || host.endsWith('zoopinternet.app');
  const domainPart = isZoopDomain ? `; domain=.${host.split('.').slice(-2).join('.')}` : '';
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
}

export interface SharedSessionPayload {
  user: UserProfile;
  deviceId?: string | null;
  deviceName?: string | null;
  endpointId?: string | null;
  pubKey?: string | null;
  privKey?: string | null;
}

export function getSharedSessionPayload(): SharedSessionPayload | null {
  const user = getSavedUserProfile();
  if (!user) return null;
  return {
    user,
    deviceId: getSavedDeviceId(),
    deviceName: getSavedDeviceName(),
    endpointId: getSavedEndpointId(),
    pubKey: localStorage.getItem(PUB_KEY),
    privKey: localStorage.getItem(PRIV_KEY),
  };
}

export function syncSessionToCookie(payload?: SharedSessionPayload | null): void {
  const p = payload || getSharedSessionPayload();
  if (!p || !p.user) return;
  try {
    setSharedCookie(SHARED_COOKIE_NAME, JSON.stringify(p));
  } catch (err) {
    console.warn('Failed to sync session to shared cookie:', err);
  }
}

export function restoreSharedSession(payload: SharedSessionPayload): void {
  if (!payload || !payload.user) return;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(payload.user));
  if (payload.deviceId) localStorage.setItem(IDENTITY_KEY, payload.deviceId);
  if (payload.deviceName) localStorage.setItem(NAME_KEY, payload.deviceName);
  if (payload.endpointId) localStorage.setItem(ENDPOINT_KEY, payload.endpointId);
  if (payload.pubKey) localStorage.setItem(PUB_KEY, payload.pubKey);
  if (payload.privKey) {
    localStorage.setItem(PRIV_KEY, payload.privKey);
    try { sessionStorage.setItem(PRIV_KEY, payload.privKey); } catch {}
  }
  syncSessionToCookie(payload);
}

export function initSharedIdentity(): void {
  if (typeof window === 'undefined') return;

  // 1. Check URL hash for #auth_sync= (handoff between subdomains)
  try {
    const hash = window.location.hash;
    if (hash && hash.includes('auth_sync=')) {
      const match = hash.match(/auth_sync=([^&]+)/);
      if (match && match[1]) {
        const decoded = base64ToUtf8(decodeURIComponent(match[1]));
        const payload = JSON.parse(decoded) as SharedSessionPayload;
        if (payload?.user) {
          restoreSharedSession(payload);
        }
      }
      // Clean auth_sync parameter from hash
      const newHash = hash.replace(/#?auth_sync=[^&]+&?/, '').replace(/^#$/, '');
      const newUrl = window.location.pathname + window.location.search + (newHash ? '#' + newHash : '');
      window.history.replaceState({}, '', newUrl);
    }
  } catch (err) {
    console.warn('Failed to parse auth_sync from hash:', err);
  }

  // 2. If no local user profile, try shared cookie from .zoopnetwork.app
  try {
    if (!localStorage.getItem(USER_PROFILE_KEY)) {
      const cookieVal = getSharedCookie(SHARED_COOKIE_NAME);
      if (cookieVal) {
        const payload = JSON.parse(cookieVal) as SharedSessionPayload;
        if (payload?.user) {
          restoreSharedSession(payload);
        }
      }
    } else {
      syncSessionToCookie();
    }
  } catch (err) {
    console.warn('Failed to sync session from shared cookie:', err);
  }
}

// Run immediately on module evaluation so storage is ready before any React state initializes
initSharedIdentity();

export function getSavedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  syncSessionToCookie();
}

export function clearUserProfile() {
  localStorage.removeItem(USER_PROFILE_KEY);
  clearSharedCookie(SHARED_COOKIE_NAME);
}

export function getSavedDeviceId(): string | null {
  return localStorage.getItem(IDENTITY_KEY);
}

export function getSavedEndpointId(): string | null {
  return localStorage.getItem(ENDPOINT_KEY);
}

export function getSavedDeviceName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function saveDeviceId(id: string, name: string, endpointId?: string) {
  localStorage.setItem(IDENTITY_KEY, id);
  localStorage.setItem(NAME_KEY, name);
  if (endpointId) {
    localStorage.setItem(ENDPOINT_KEY, endpointId);
  }
  syncSessionToCookie();
}

export function clearSavedDevice() {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(ENDPOINT_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(PRIV_KEY);
  localStorage.removeItem(PUB_KEY);
  sessionStorage.removeItem(PRIV_KEY);
  sessionStorage.removeItem(PUB_KEY);
  clearSharedCookie(SHARED_COOKIE_NAME);
  cachedPrivateKey = null;
}

/**
 * Generate a new Ed25519 keypair using Web Crypto API.
 * Exports public key (raw 32 bytes) as Base64 for registration.
 * Saves private key (PKCS8) locally for request signing.
 */
export async function generateAndSaveIdentity(name: string): Promise<{ publicKeyB64: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  cachedPrivateKey = keyPair.privateKey;

  const rawPub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const rawPriv = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const pubB64 = uint8ArrayToBase64(new Uint8Array(rawPub));
  const privB64 = uint8ArrayToBase64(new Uint8Array(rawPriv));

  localStorage.setItem(NAME_KEY, name);
  localStorage.setItem(PUB_KEY, pubB64);
  localStorage.setItem(PRIV_KEY, privB64);
  try {
    sessionStorage.setItem(PRIV_KEY, privB64);
  } catch {
    /* ignore */
  }

  return { publicKeyB64: pubB64 };
}

/**
 * Retrieves or imports the cached Ed25519 private CryptoKey.
 */
export async function getPrivateKey(): Promise<CryptoKey | null> {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const privB64 = localStorage.getItem(PRIV_KEY) || sessionStorage.getItem(PRIV_KEY);
  if (!privB64) {
    return null;
  }

  try {
    const rawPriv = base64ToUint8Array(privB64);
    const key = await crypto.subtle.importKey(
      'pkcs8',
      rawPriv.buffer as ArrayBuffer,
      { name: 'Ed25519' },
      false,
      ['sign']
    );
    cachedPrivateKey = key;
    return key;
  } catch (err) {
    console.error('Failed to import saved Ed25519 private key', err);
    return null;
  }
}

/**
 * Signs an HTTP request payload according to the Zoop Auth v2 specification:
 * Canonical String: `zoop-auth-v2|METHOD|PATH|TIMESTAMP|NONCE|BODY_HASH`
 */
export class NotAuthenticatedError extends Error {
  constructor(msg = 'Not signed in — no device identity') {
    super(msg);
    this.name = 'NotAuthenticatedError';
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getSavedEndpointId() ?? getSavedDeviceId());
}

export async function buildSignedAuthHeaders(
  method: string,
  path: string,
  body?: string
): Promise<Record<string, string>> {
  // Auth identity is the endpoint_id (SHA1 of the Ed25519 pubkey), which is what
  // the cloud AuthMiddleware resolves. The device_id is a separate registry record.
  const endpointId = getSavedEndpointId() ?? getSavedDeviceId();
  if (!endpointId) {
    throw new NotAuthenticatedError();
  }

  const privKey = await getPrivateKey();
  const timestamp = new Date().toISOString();
  const nonce = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

  let bodyHashHex = '';
  if (body && body.length > 0) {
    const bodyBytes = new TextEncoder().encode(body);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bodyBytes);
    bodyHashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Canonical format matching packages/cloud/api/middleware.go
  const canonicalPayload = `zoop-auth-v2|${method.toUpperCase()}|${path}|${timestamp}|${nonce}|${bodyHashHex}`;
  const payloadBytes = new TextEncoder().encode(canonicalPayload);

  let signatureB64 = '';
  if (!privKey) {
    throw new Error('No private key available to sign the request');
  }
  const sigBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privKey,
    payloadBytes
  );
  signatureB64 = uint8ArrayToBase64(new Uint8Array(sigBuffer));

  return {
    'X-Zoop-Device-ID': endpointId,
    'X-Zoop-Identity': endpointId,
    'X-Zoop-Signature': signatureB64,
    'X-Zoop-Timestamp': timestamp,
    'X-Zoop-Nonce': nonce,
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
