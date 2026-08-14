import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ApiDevice, ApiShare, ApiConnection } from '../api/client';
import {
  registerDevice, getDevice, getPendingConnections,
  createShare, createConnection, updateConnectionState,
} from '../api/client';
import { getSavedDeviceId, getSavedDeviceName, saveDeviceId, clearSavedDevice } from '../api/identity';

export interface AppState {
  // Auth / identity
  deviceId: string | null;
  deviceName: string | null;
  deviceInfo: ApiDevice | null;
  isRegistering: boolean;
  registerError: string | null;
  register: (name: string, platform: string, isProvider: boolean) => Promise<void>;
  unregister: () => void;

  // Shares
  shares: ApiShare[];
  sharesLoading: boolean;
  refreshShares: () => void;
  doCreateShare: (recipientId: string) => Promise<void>;

  // Connections
  pendingConnections: ApiConnection[];
  connectionsLoading: boolean;
  refreshConnections: () => void;
  doConnect: (providerId: string, shareId: string) => Promise<ApiConnection | null>;
  doDisconnect: (connId: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(getSavedDeviceId());
  const [deviceName, setDeviceName] = useState<string | null>(getSavedDeviceName());
  const [deviceInfo, setDeviceInfo] = useState<ApiDevice | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [shares, setShares] = useState<ApiShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [pendingConnections, setPendingConnections] = useState<ApiConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Load device info when we have a deviceId
  useEffect(() => {
    if (!deviceId) { setDeviceInfo(null); return; }
    getDevice(deviceId, deviceId)
      .then(d => setDeviceInfo(d))
      .catch(() => setDeviceInfo(null));
  }, [deviceId]);

  const register = useCallback(async (name: string, platform: string, isProvider: boolean) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      // Generate a simple random public key placeholder for the web client
      // In production this would be an actual Ed25519 keypair
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const publicKeyB64 = btoa(String.fromCharCode(...randomBytes));

      const caps = isProvider ? ['provider', 'recipient'] : ['recipient'];
      const resp = await registerDevice({
        name,
        platform,
        public_key: publicKeyB64,
        capabilities: caps,
      });
      saveDeviceId(resp.id.toString(), name);
      setDeviceId(resp.id.toString());
      setDeviceName(name);
      setDeviceInfo(resp);
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const unregister = useCallback(() => {
    clearSavedDevice();
    setDeviceId(null);
    setDeviceName(null);
    setDeviceInfo(null);
    setShares([]);
    setPendingConnections([]);
  }, []);

  const refreshShares = useCallback(() => {
    if (!deviceId) return;
    setSharesLoading(true);
    // Backend doesn't have a list-shares endpoint yet; we store locally for now
    setSharesLoading(false);
  }, [deviceId]);

  const doCreateShare = useCallback(async (recipientId: string) => {
    if (!deviceId) throw new Error('Not registered');
    const share = await createShare(deviceId, recipientId);
    setShares(prev => [share, ...prev]);
  }, [deviceId]);

  const refreshConnections = useCallback(() => {
    if (!deviceId) return;
    setConnectionsLoading(true);
    getPendingConnections(deviceId)
      .then(conns => setPendingConnections(conns))
      .catch(() => setPendingConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) refreshConnections();
  }, [deviceId, refreshConnections]);

  const doConnect = useCallback(async (providerId: string, shareId: string): Promise<ApiConnection | null> => {
    if (!deviceId) return null;
    const conn = await createConnection(deviceId, providerId, shareId);
    return conn;
  }, [deviceId]);

  const doDisconnect = useCallback(async (connId: string) => {
    if (!deviceId) return;
    await updateConnectionState(connId, deviceId, 'disconnected');
    setPendingConnections(prev => prev.filter(c => c.id !== connId));
  }, [deviceId]);

  return (
    <AppContext.Provider value={{
      deviceId, deviceName, deviceInfo, isRegistering, registerError,
      register, unregister,
      shares, sharesLoading, refreshShares, doCreateShare,
      pendingConnections, connectionsLoading, refreshConnections,
      doConnect, doDisconnect,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
