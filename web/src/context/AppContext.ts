import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';
import type { ApiDevice, ApiShare, ApiConnection, ApiOrg, ApiOrgMember } from '../api/client';
import type { DaemonStatus, DaemonPeer, DaemonTelemetryEntry } from '../api/daemon';

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
  doDeleteShare: (shareId: string) => Promise<void>;

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
  doRemoveOrgMember: (memberId: string) => Promise<void>;
  refreshOrgMembers: (orgId?: string) => void;

  // Local daemon mode
  localMode: boolean;
  daemonChecking: boolean;
  daemonStatus: DaemonStatus | null;
  daemonPeers: DaemonPeer[];
  daemonTelemetry: DaemonTelemetryEntry[];
  refreshDaemon: () => void;
}

export const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
