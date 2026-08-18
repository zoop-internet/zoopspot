/**
 * Local identity & device registration for the web app.
 *
 * The web app creates a real self-signed Ed25519 keypair using the Web Cryptography API.
 * The public key (32-byte raw Ed25519) is registered with the Control Plane.
 * The private key (PKCS8) is preserved in storage/memory for signing authenticated API calls.
 */

const IDENTITY_KEY = 'zoop:web:device_id';
const ENDPOINT_KEY = 'zoop:web:endpoint_id';
const NAME_KEY = 'zoop:web:device_name';
const PRIV_KEY = 'zoop:web:priv_key';
const PUB_KEY = 'zoop:web:pub_key';

let cachedPrivateKey: CryptoKey | null = null;

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
}

export function clearSavedDevice() {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(ENDPOINT_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(PRIV_KEY);
  localStorage.removeItem(PUB_KEY);
  sessionStorage.removeItem(PRIV_KEY);
  sessionStorage.removeItem(PUB_KEY);
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
export async function buildSignedAuthHeaders(
  method: string,
  path: string,
  body?: string
): Promise<Record<string, string>> {
  // Auth identity is the endpoint_id (SHA1 of the Ed25519 pubkey), which is what
  // the cloud AuthMiddleware resolves. The device_id is a separate registry record.
  const endpointId = getSavedEndpointId() ?? getSavedDeviceId();
  if (!endpointId) {
    return {};
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
