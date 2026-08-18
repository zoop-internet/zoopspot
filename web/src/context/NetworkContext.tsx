import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ApiDevice, ApiShare, ApiConnection, ApiOrg, ApiOrgMember } from '../api/client';
import {
  registerDevice, getDevice, listDevices, getPendingConnections,
  createShare, createConnection, updateConnectionState, listConnections, listShares,
  unregisterDevice,
  createOrganization, listOrganizations, addOrgMember, listOrgMembers,
  subscribeToEvents,
} from '../api/client';
import {
  getSavedDeviceId, getSavedDeviceName, saveDeviceId, clearSavedDevice,
  generateAndSaveIdentity,
} from '../api/identity';

export interface AppState {
  // Auth / identity
  deviceId: string | null;
  deviceName: string | null;
  deviceInfo: ApiDevice | null;
  isRegistering: boolean;
  registerError: string | null;
  register: (name: string, platform: string, isProvider: boolean) => Promise<void>;
  unregister: () => Promise<void>;

  // Device Fleet
  allDevices: ApiDevice[];
  devicesLoading: boolean;
  refreshAllDevices: () => void;

  // Shares
  shares: ApiShare[];
  sharesLoading: boolean;
  refreshShares: () => void;
  doCreateShare: (recipientId: string) => Promise<void>;

  // Connections
  connections: ApiConnection[];
  connectionsLoading: boolean;
  refreshConnections: () => void;
  doConnect: (providerId: string, shareId?: string) => Promise<ApiConnection | null>;
  doDisconnect: (connId: string) => Promise<void>;

  // Organizations
  organizations: ApiOrg[];
  currentOrg: ApiOrg | null;
  orgMembers: ApiOrgMember[];
  orgsLoading: boolean;
  refreshOrganizations: () => void;
  doCreateOrg: (name: string, slug?: string) => Promise<ApiOrg>;
  selectOrg: (org: ApiOrg) => void;
  doAddOrgMember: (name: string, email: string, role: string) => Promise<void>;
  refreshOrgMembers: (orgId?: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(getSavedDeviceId());
  const [deviceName, setDeviceName] = useState<string | null>(getSavedDeviceName());
  const [deviceInfo, setDeviceInfo] = useState<ApiDevice | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const autoRegisteredRef = useRef(false);

  const [allDevices, setAllDevices] = useState<ApiDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [shares, setShares] = useState<ApiShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const [organizations, setOrganizations] = useState<ApiOrg[]>([]);
  const [currentOrg, setCurrentOrg] = useState<ApiOrg | null>(null);
  const [orgMembers, setOrgMembers] = useState<ApiOrgMember[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // Load device info when we have a deviceId
  useEffect(() => {
    if (!deviceId) { setDeviceInfo(null); return; }
    getDevice(deviceId)
      .then(d => setDeviceInfo(d))
      .catch(() => {
        // Stored identity no longer exists server-side (e.g. cloud reset).
        // Clear it so auto-register can create a fresh identity.
        setDeviceInfo(null);
        clearSavedDevice();
        setDeviceId(null);
        setDeviceName(null);
      });
  }, [deviceId]);

  const refreshAllDevices = useCallback(() => {
    setDevicesLoading(true);
    listDevices()
      .then(d => setAllDevices(d))
      .catch(() => setAllDevices([]))
      .finally(() => setDevicesLoading(false));
  }, []);

  useEffect(() => {
    refreshAllDevices();
  }, [refreshAllDevices]);

  const register = useCallback(async (name: string, platform: string, isProvider: boolean) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const { publicKeyB64 } = await generateAndSaveIdentity(name);

      const caps = isProvider ? ['provider', 'recipient'] : ['recipient'];
      const resp = await registerDevice({
        name,
        platform,
        public_key: publicKeyB64,
        capabilities: caps,
      });
      saveDeviceId(resp.id.toString(), name, resp.endpoint_id);
      setDeviceId(resp.id.toString());
      setDeviceName(name);
      setDeviceInfo(resp);
      refreshAllDevices();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  }, [refreshAllDevices]);

  // Auto-register the browser as a device on first load so the portal
  // starts populated instead of showing "Not registered" empty states.
  useEffect(() => {
    if (deviceId || autoRegisteredRef.current) return;
    autoRegisteredRef.current = true;
    register('My Device', 'web', false).catch(() => {});
  }, [deviceId, register]);

  const unregister = useCallback(async () => {
    if (deviceId) {
      try {
        await unregisterDevice(deviceId);
      } catch {
        // Proceed with local cleanup even if the API call fails.
      }
    }
    clearSavedDevice();
    setDeviceId(null);
    setDeviceName(null);
    setDeviceInfo(null);
    setShares([]);
    setConnections([]);
  }, [deviceId]);

  const refreshShares = useCallback(() => {
    if (!deviceId) return;
    setSharesLoading(true);
    listShares()
      .then(s => setShares(s))
      .catch(() => setShares([]))
      .finally(() => setSharesLoading(false));
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) refreshShares();
  }, [deviceId, refreshShares]);

  const doCreateShare = useCallback(async (recipientId: string) => {
    if (!deviceId) throw new Error('Not registered');
    const share = await createShare(deviceId, recipientId);
    setShares(prev => [share, ...prev]);
  }, [deviceId]);

  const refreshConnections = useCallback(() => {
    if (!deviceId) return;
    setConnectionsLoading(true);
    Promise.all([getPendingConnections(deviceId), listConnections()])
      .then(([pending, all]) => {
        const merged = new Map<string, ApiConnection>();
        for (const c of [...all, ...pending]) merged.set(c.id.toString(), c);
        setConnections([...merged.values()]);
      })
      .catch(() => setConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) refreshConnections();
  }, [deviceId, refreshConnections]);

  // Subscribe to real-time server events (SSE) and refresh affected lists.
  useEffect(() => {
    if (!deviceId) return;

    let cleanup: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let aborted = false;

    const connect = async () => {
      try {
        cleanup = await subscribeToEvents(
          ev => {
            if (ev.type === 'share_created') refreshShares();
            if (ev.type === 'connection_requested' || ev.type === 'connection_updated') {
              refreshConnections();
            }
          },
          () => {
            // Stream dropped: resync once then retry the subscription.
            if (aborted) return;
            refreshShares();
            refreshConnections();
            retryTimer = setTimeout(connect, 3000);
          },
        );
      } catch {
        if (aborted) return;
        retryTimer = setTimeout(connect, 3000);
      }
    };

    void connect();

    return () => {
      aborted = true;
      cleanup?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [deviceId, refreshShares, refreshConnections]);

  const doConnect = useCallback(async (providerId: string, _shareId?: string): Promise<ApiConnection | null> => {
    if (!deviceId) return null;
    const conn = await createConnection(providerId, deviceId);
    return conn;
  }, [deviceId]);

  const doDisconnect = useCallback(async (connId: string) => {
    if (!deviceId) return;
    await updateConnectionState(connId, 'DISCONNECTED');
    setConnections(prev => prev.filter(c => c.id.toString() !== connId));
  }, [deviceId]);

  // Organizations logic
  const refreshOrganizations = useCallback(() => {
    setOrgsLoading(true);
    listOrganizations()
      .then(orgs => {
        setOrganizations(orgs);
        if (orgs.length > 0 && !currentOrg) {
          setCurrentOrg(orgs[0]);
        }
      })
      .catch(() => setOrganizations([]))
      .finally(() => setOrgsLoading(false));
  }, [currentOrg]);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const refreshOrgMembers = useCallback((orgId?: string) => {
    const targetId = orgId || currentOrg?.id.toString();
    if (!targetId) return;
    listOrgMembers(targetId)
      .then(m => setOrgMembers(m))
      .catch(() => setOrgMembers([]));
  }, [currentOrg]);

  useEffect(() => {
    if (currentOrg) {
      refreshOrgMembers(currentOrg.id.toString());
    }
  }, [currentOrg, refreshOrgMembers]);

  const doCreateOrg = useCallback(async (name: string, slug?: string): Promise<ApiOrg> => {
    const org = await createOrganization(name, slug);
    setOrganizations(prev => [...prev, org]);
    setCurrentOrg(org);
    return org;
  }, []);

  const selectOrg = useCallback((org: ApiOrg) => {
    setCurrentOrg(org);
    refreshOrgMembers(org.id.toString());
  }, [refreshOrgMembers]);

  const doAddOrgMember = useCallback(async (name: string, email: string, role: string) => {
    if (!currentOrg) throw new Error('No active organization');
    const member = await addOrgMember(currentOrg.id.toString(), name, email, role);
    setOrgMembers(prev => [...prev, member]);
  }, [currentOrg]);

  return (
    <AppContext.Provider value={{
      deviceId, deviceName, deviceInfo, isRegistering, registerError,
      register, unregister,
      allDevices, devicesLoading, refreshAllDevices,
      shares, sharesLoading, refreshShares, doCreateShare,
      connections, connectionsLoading, refreshConnections,
      doConnect, doDisconnect,
      organizations, currentOrg, orgMembers, orgsLoading,
      refreshOrganizations, doCreateOrg, selectOrg, doAddOrgMember, refreshOrgMembers,
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
