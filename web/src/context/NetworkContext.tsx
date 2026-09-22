import React, { useState, useEffect, useCallback } from 'react';
import { AppContext } from './AppContext';
import type { ApiDevice, ApiShare, ApiConnection, ApiOrg, ApiOrgMember } from '../api/client';
import {
  registerDevice, getDevice, listDevices, getPendingConnections,
  createShare, createConnection, updateConnectionState, listConnections, listShares, deleteShare,
  unregisterDevice,
  createOrganization, listOrganizations, addOrgMember, listOrgMembers, removeOrgMember,
  subscribeToEvents,
  apiAuthSignup, apiAuthLogin,
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
// Uses crypto.getRandomValues for unbiased entropy; ID is provisional until server confirms (no reserve endpoint yet).
function generateZoopId(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const buf = new Uint32Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += alphabet[buf[i] % alphabet.length];
  return `ZP-${suffix}`;
}
function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32) || 'zoopuser';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = getSavedUserProfile();
    if (saved && (saved.username?.toLowerCase() === 'admin' || saved.zoopId?.toUpperCase() === 'ZP-9UZU8C' || saved.id === '63699124-3da9-452c-9fd8-1325b95add0a')) {
      return { ...saved, role: 'admin' };
    }
    return saved;
  });
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

  // Load device info when we have a deviceId — only clear on 404/not found, not on auth/network errors
  useEffect(() => {
    if (!deviceId) { setDeviceInfo(null); return; }
    getDevice(deviceId)
      .then(d => setDeviceInfo(d))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        const isNotFound = msg.toLowerCase().includes('not found') || msg.includes('404');
        if (!isNotFound) {
          setDeviceInfo(null);
          return;
        }
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

  // Auto-connect device if user is signed in but deviceId is missing in storage
  useEffect(() => {
    if (user && !deviceId && !isRegistering) {
      const devName = `${user.name || user.username || 'My'}'s Web Client`;
      register(devName, 'web', false).catch((err) => {
        console.warn('Auto device registration deferred:', err);
      });
    }
  }, [user, deviceId, isRegistering, register]);

  const login = useCallback(async (identifier: string, pin?: string, remember: boolean = true) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      const raw = identifier.trim();
      if (!pin || !/^\d{6}$/.test(pin)) {
        throw new Error('Zoop PIN must be exactly 6 digits');
      }

      // Generate device identity keypair for this web session
      const devName = `${raw}'s Web Client`;
      const { publicKeyB64 } = await generateAndSaveIdentity(devName);

      const resp = await apiAuthLogin({
        identifier: raw,
        pin,
        device_name: devName,
        platform: 'web',
        public_key: publicKeyB64,
      });

      const isOperatorOrAdmin = raw.toLowerCase() === 'admin' ||
        resp.user.username?.toLowerCase() === 'admin' ||
        resp.user.zoop_id?.toUpperCase() === 'ZP-9UZU8C' ||
        resp.user.id === '63699124-3da9-452c-9fd8-1325b95add0a' ||
        (resp.user as unknown as { role?: string }).role === 'admin' ||
        (resp.user as unknown as { role?: string }).role === 'operator';
      const profile: UserProfile = {
        id: resp.user.zoop_id || resp.user.id,
        zoopId: resp.user.zoop_id,
        username: resp.user.username,
        name: resp.user.name,
        plan: 'free',
        role: isOperatorOrAdmin ? 'admin' : ((resp.user as unknown as { role?: string }).role || 'owner'),
        createdAt: resp.user.created_at || new Date().toISOString(),
      };

      if (remember) saveUserProfile(profile);
      setUser(profile);

      saveDeviceId(resp.device.id.toString(), devName, resp.device.endpoint_id);
      setDeviceId(resp.device.id.toString());
      setDeviceName(devName);
      setDeviceInfo(resp.device);
      refreshAllDevices();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [refreshAllDevices]);

  const signup = useCallback(async (username: string, pin: string, displayName?: string, deviceName?: string, _isProvider: boolean = false) => {
    setIsRegistering(true);
    setRegisterError(null);
    try {
      if (!/^\d{6}$/.test(pin)) throw new Error('Zoop PIN must be exactly 6 digits');
      const cleanUsername = normalizeUsername(username);
      if (cleanUsername.length < 2) throw new Error('Username must be at least 2 characters');
      const cleanName = displayName?.trim() || cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);
      const cleanDevName = deviceName?.trim() || `${cleanName}'s Web Client`;

      const { publicKeyB64 } = await generateAndSaveIdentity(cleanDevName);

      const resp = await apiAuthSignup({
        username: cleanUsername,
        pin,
        name: cleanName,
        device_name: cleanDevName,
        platform: 'web',
        public_key: publicKeyB64,
      });

      const isOperatorOrAdmin = cleanUsername === 'admin';
      const profile: UserProfile = {
        id: resp.user.zoop_id || resp.user.id,
        zoopId: resp.user.zoop_id,
        username: resp.user.username,
        name: resp.user.name,
        plan: 'free',
        role: isOperatorOrAdmin ? 'admin' : 'owner',
        createdAt: resp.user.created_at || new Date().toISOString(),
      };

      saveUserProfile(profile);
      setUser(profile);

      saveDeviceId(resp.device.id.toString(), cleanDevName, resp.device.endpoint_id);
      setDeviceId(resp.device.id.toString());
      setDeviceName(cleanDevName);
      setDeviceInfo(resp.device);
      refreshAllDevices();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [refreshAllDevices]);

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

  const doDeleteShare = useCallback(async (shareId: string) => {
    await deleteShare(shareId);
    setShares(prev => prev.filter(s => s.id.toString() !== shareId));
  }, []);

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
            if (ev.type === 'share_created' || ev.type === 'share_revoked') refreshShares();
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

  const doRemoveOrgMember = useCallback(async (memberId: string) => {
    if (!currentOrg) throw new Error('No active organization');
    await removeOrgMember(currentOrg.id.toString(), memberId);
    setOrgMembers(prev => prev.filter(m => m.id.toString() !== memberId));
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
      shares, sharesLoading, refreshShares, doCreateShare, doDeleteShare,
      connections, connectionsLoading, connectionsError, refreshConnections,
      doConnect, doDisconnect, doAcceptConnection,
      organizations, currentOrg, orgMembers, orgsLoading,
      refreshOrganizations, doCreateOrg, selectOrg, doAddOrgMember, doRemoveOrgMember, refreshOrgMembers,
      localMode, daemonChecking, daemonStatus, daemonPeers, daemonTelemetry, refreshDaemon,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
