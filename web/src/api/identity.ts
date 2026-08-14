/**
 * Local identity & device registration for the web app.
 *
 * The web app creates a self-signed Ed25519 keypair for the browser session
 * and registers it as a "web-client" device with the Control Plane.
 * This device ID is then used for authenticated API calls.
 *
 * Private key stays in memory. Public key is registered with the backend.
 */

export interface LocalIdentity {
  deviceId: string;
  deviceName: string;
  platform: 'web';
  publicKeyB64: string;
  // CryptoKeyPair kept in memory only
}

const IDENTITY_KEY = 'zoop:web:device_id';
const NAME_KEY = 'zoop:web:device_name';

export function getSavedDeviceId(): string | null {
  return localStorage.getItem(IDENTITY_KEY);
}

export function getSavedDeviceName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function saveDeviceId(id: string, name: string) {
  localStorage.setItem(IDENTITY_KEY, id);
  localStorage.setItem(NAME_KEY, name);
}

export function clearSavedDevice() {
  localStorage.removeItem(IDENTITY_KEY);
  localStorage.removeItem(NAME_KEY);
}
