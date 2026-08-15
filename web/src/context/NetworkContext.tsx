import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ApiDevice, ApiShare, ApiConnection, ApiOrg, ApiOrgMember } from '../api/client';
import {
  registerDevice, getDevice, listDevices, getPendingConnections,
  createShare, createConnection, updateConnectionState,
  createOrganization, listOrganizations, addOrgMember, listOrgMembers,
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
  unregister: () => void;

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
  pendingConnections: ApiConnection[];
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
  doCreateOrg: (name: string) => Promise<ApiOrg>;
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

  const [allDevices, setAllDevices] = useState<ApiDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [shares, setShares] = useState<ApiShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [pendingConnections, setPendingConnections] = useState<ApiConnection[]>([]);
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
      .catch(() => setDeviceInfo(null));
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
      saveDeviceId(resp.id.toString(), name);
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

  const doConnect = useCallback(async (providerId: string, _shareId?: string): Promise<ApiConnection | null> => {
    if (!deviceId) return null;
    const conn = await createConnection(providerId, deviceId);
    return conn;
  }, [deviceId]);

  const doDisconnect = useCallback(async (connId: string) => {
    if (!deviceId) return;
    await updateConnectionState(connId, 'disconnected');
    setPendingConnections(prev => prev.filter(c => c.id !== connId));
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

  const doCreateOrg = useCallback(async (name: string): Promise<ApiOrg> => {
    const org = await createOrganization(name);
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
      pendingConnections, connectionsLoading, refreshConnections,
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
