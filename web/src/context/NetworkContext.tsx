import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  getSavedUserProfile, saveUserProfile, clearUserProfile,
  generateAndSaveIdentity,
} from '../api/identity';
import {
  probeDaemon, getDaemonStatus, getDaemonPeers, getDaemonTelemetry,
  subscribeToDaemonStream,
} from '../api/daemon';
import type { DaemonStatus, DaemonPeer, DaemonTelemetryEntry, DaemonStreamSnapshot } from '../api/daemon';

import type { UserProfile } from '../types';

// Helpers per docs/identity.md — Zoop ID is permanent, username is mutable handle, PIN is 6 digits
function generateZoopId(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ZP-${suffix}`;
}
function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32) || 'zoopuser';
}
function formatUsername(raw: string): string {
  const n = normalizeUsername(raw);
  return n;
}

export interface AppState {
  // Auth / user profile — per docs/identity.md: Zoop ID + @username + 6-digit PIN, no email required
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (identifier: string, pin?: string, remember?: boolean) => Promise<void>;
  signup: (username: string, pin: string, displayName?: string, deviceName?: string, isProvider?: boolean) => Promise<void>;
  loginWithKey: (keyData: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;

  // Device identity
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
  connectionsError: boolean;
  refreshConnections: () => void;
  doConnect: (providerId: string, shareId?: string) => Promise<ApiConnection | null>;
  doDisconnect: (connId: string) => Promise<void>;
  doAcceptConnection: (connId: string) => Promise<void>;

  // Organizations
  organizations: ApiOrg[];
  currentOrg: ApiOrg | null;
  orgMembers: ApiOrgMember[];
  orgsLoading: boolean;
  refreshOrganizations: () => void;
  doCreateOrg: (name: string, slug?: string) => Promise<ApiOrg>;
  selectOrg: (org: ApiOrg) => void;
  doAddOrgMember: (name: string, handle: string, role: string) => Promise<void>;
  refreshOrgMembers: (orgId?: string) => void;

  // Local daemon mode
  localMode: boolean;
  daemonChecking: boolean;
  daemonStatus: DaemonStatus | null;
  daemonPeers: DaemonPeer[];
  daemonTelemetry: DaemonTelemetryEntry[];
  refreshDaemon: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => getSavedUserProfile());
  const [deviceId, setDeviceId] = useState<string | null>(getSavedDeviceId());
  const [deviceName, setDeviceName] = useState<string | null>(getSavedDeviceName());
  const [deviceInfo, setDeviceInfo] = useState<ApiDevice | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [allDevices, setAllDevices] = useState<ApiDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [shares, setShares] = useState<ApiShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState(false);

  const [organizations, setOrganizations] = useState<ApiOrg[]>([]);
  const [currentOrg, setCurrentOrg] = useState<ApiOrg | null>(null);
  const [orgMembers, setOrgMembers] = useState<ApiOrgMember[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // Local daemon mode: true when zoopd is reachable on 127.0.0.1:9090.
  const [localMode, setLocalMode] = useState(false);
  const [daemonChecking, setDaemonChecking] = useState(true);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus | null>(null);
  const [daemonPeers, setDaemonPeers] = useState<DaemonPeer[]>([]);
  const [daemonTelemetry, setDaemonTelemetry] = useState<DaemonTelemetryEntry[]>([]);

  const refreshDaemon = useCallback(() => {
    setDaemonChecking(true);
    Promise.allSettled([getDaemonStatus(), getDaemonPeers(), getDaemonTelemetry()])
      .then(([status, peers, telemetry]) => {
        if (status.status === 'fulfilled') setDaemonStatus(status.value);
        if (peers.status === 'fulfilled') setDaemonPeers(peers.value);
        if (telemetry.status === 'fulfilled') setDaemonTelemetry(telemetry.value);
      })
      .finally(() => setDaemonChecking(false));
  }, []);

  // Probe for a local daemon on load (and once more shortly after, in case the
  // daemon is still starting up).
  useEffect(() => {
    let active = true;
    const check = async () => {
      const up = await probeDaemon();
      if (!active) return;
      setLocalMode(up);
      if (up) refreshDaemon();
      setDaemonChecking(false);
    };
    void check();
    const retry = setTimeout(check, 2500);
    return () => { active = false; clearTimeout(retry); };
  }, [refreshDaemon]);

  // Subscribe to live daemon stream updates when local mode is active.
  useEffect(() => {
    if (!localMode) return;
    const cleanup = subscribeToDaemonStream(
      (snap: DaemonStreamSnapshot) => {
        setDaemonTelemetry(snap.telemetry);
      },
      () => {
        // Stream dropped: stop treating the daemon as the live source until
        // the periodic re-probe re-enables it.
        setLocalMode(false);
        setDaemonStatus(null);
      },
    );
    return cleanup;
  }, [localMode]);

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
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [refreshAllDevices]);

  const login = useCallback(async (identifier: string, _pin?: string, remember: boolean = true) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const raw = identifier.trim();
      const isZoopId = /^ZP-[A-Z0-9]{4,}$/i.test(raw);
      // Support legacy email login by extracting username part
      const handleRaw = raw.includes('@') && raw.includes('.') ? raw.split('@')[0] : raw;
      const username = formatUsername(handleRaw);
      const zoopId = isZoopId ? raw.toUpperCase() : (getSavedUserProfile()?.zoopId || generateZoopId());
      const displayName = username.charAt(0).toUpperCase() + username.slice(1);
      if (_pin && !/^\d{6}$/.test(_pin)) throw new Error('Zoop PIN must be exactly 6 digits');

      const profile: UserProfile = {
        id: zoopId,
        zoopId,
        username,
        name: displayName,
        plan: 'free',
        role: 'owner',
        createdAt: new Date().toISOString(),
      };

      if (remember) saveUserProfile(profile);
      setUser(profile);

      if (!deviceId) {
        const devName = `${displayName}'s Web Client`;
        await register(devName, 'web', false);
      }
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [deviceId, register]);

  const signup = useCallback(async (username: string, pin: string, displayName?: string, deviceName?: string, isProvider: boolean = false) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      if (!/^\d{6}$/.test(pin)) throw new Error('Zoop PIN must be exactly 6 digits');
      const cleanUsername = formatUsername(username);
      if (cleanUsername.length < 2) throw new Error('Username must be at least 2 characters');
      const zoopId = generateZoopId();
      const cleanName = displayName?.trim() || cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);
      const cleanDevName = deviceName?.trim() || `${cleanName}'s Web Client`;

      const profile: UserProfile = {
        id: zoopId,
        zoopId,
        username: cleanUsername,
        name: cleanName,
        plan: 'free',
        role: 'owner',
        createdAt: new Date().toISOString(),
      };

      saveUserProfile(profile);
      setUser(profile);

      await register(cleanDevName, 'web', isProvider);
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [register]);

  const loginWithKey = useCallback(async (_keyData: string, name?: string) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const devName = name?.trim() || 'Imported Key Device';
      await register(devName, 'web', false);
      const zoopId = generateZoopId();
      const username = normalizeUsername(devName).slice(0, 16) || 'device';
      const profile: UserProfile = {
        id: zoopId,
        zoopId,
        username,
        name: devName,
        plan: 'free',
        role: 'owner',
        createdAt: new Date().toISOString(),
      };
      saveUserProfile(profile);
      setUser(profile);
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Key import failed');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [register]);

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

  const logout = useCallback(async () => {
    clearUserProfile();
    setUser(null);
    await unregister();
  }, [unregister]);

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
    setConnectionsError(false);
    Promise.all([getPendingConnections(deviceId), listConnections()])
      .then(([pending, all]) => {
        const merged = new Map<string, ApiConnection>();
        for (const c of [...all, ...pending]) merged.set(c.id.toString(), c);
        setConnections([...merged.values()]);
      })
      .catch(() => {
        setConnectionsError(true);
        setConnections([]);
      })
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

  // Provider approves an incoming connection request by moving it to AUTHORIZED.
  const doAcceptConnection = useCallback(async (connId: string) => {
    if (!deviceId) return;
    await updateConnectionState(connId, 'AUTHORIZED');
    refreshConnections();
  }, [deviceId, refreshConnections]);

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

  const doAddOrgMember = useCallback(async (name: string, handle: string, role: string) => {
    if (!currentOrg) throw new Error('No active organization');
    const member = await addOrgMember(currentOrg.id.toString(), name, handle, role);
    setOrgMembers(prev => [...prev, member]);
  }, [currentOrg]);

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated: Boolean(user || deviceId),
      login,
      signup,
      loginWithKey,
      logout,
      deviceId, deviceName, deviceInfo, isRegistering, registerError,
      register, unregister,
      allDevices, devicesLoading, refreshAllDevices,
      shares, sharesLoading, refreshShares, doCreateShare,
      connections, connectionsLoading, connectionsError, refreshConnections,
      doConnect, doDisconnect, doAcceptConnection,
      organizations, currentOrg, orgMembers, orgsLoading,
      refreshOrganizations, doCreateOrg, selectOrg, doAddOrgMember, refreshOrgMembers,
      localMode, daemonChecking, daemonStatus, daemonPeers, daemonTelemetry, refreshDaemon,
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
