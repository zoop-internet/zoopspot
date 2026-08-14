import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DeviceIdentity, ConnectionSession, SharingPolicy, RelayNodeStatus, ConnectionState } from '../types';
import { INITIAL_DEVICES, INITIAL_SHARES, INITIAL_RELAYS, apiClient } from '../api/client';
import { signalingClient } from '../api/ws';

interface NetworkContextType {
  devices: DeviceIdentity[];
  activeSession: ConnectionSession | null;
  shares: SharingPolicy[];
  relays: RelayNodeStatus[];
  isConnecting: boolean;
  connectionStepLog: string[];
  connectToProvider: (provider: DeviceIdentity) => Promise<void>;
  disconnectTunnel: () => void;
  registerDevice: (data: Partial<DeviceIdentity>) => Promise<DeviceIdentity>;
  toggleProviderMode: (deviceId: string, enabled: boolean) => void;
  addSharePolicy: (providerId: string, recipientName: string, recipientEmail: string, maxBandwidthMbps?: number) => void;
  revokeSharePolicy: (shareId: string) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceIdentity[]>(INITIAL_DEVICES);
  const [shares, setShares] = useState<SharingPolicy[]>(INITIAL_SHARES);
  const [relays] = useState<RelayNodeStatus[]>(INITIAL_RELAYS);
  const [activeSession, setActiveSession] = useState<ConnectionSession | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionStepLog, setConnectionStepLog] = useState<string[]>([]);

  useEffect(() => {
    const unsub = signalingClient.onTelemetry((telemetry) => {
      setActiveSession(prev => prev ? { ...prev, telemetry } : null);
    });
    return () => unsub();
  }, []);

  const connectToProvider = async (provider: DeviceIdentity) => {
    setIsConnecting(true);
    setConnectionStepLog([]);

    try {
      const myDevice = devices.find(d => !d.isProvider) || devices[0];
      const session = await signalingClient.initiateConnection(
        provider.id,
        provider.name,
        provider.assignedIP,
        myDevice.id,
        myDevice.assignedIP,
        (step: string, _state: ConnectionState) => {
          setConnectionStepLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
        }
      );
      setActiveSession(session);
    } catch (err) {
      console.error('Failed to establish connection:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectTunnel = () => {
    signalingClient.stopTelemetry();
    setActiveSession(null);
    setConnectionStepLog([]);
  };

  const registerDevice = async (data: Partial<DeviceIdentity>) => {
    const newDev = await apiClient.registerDevice(data);
    setDevices(prev => [newDev, ...prev]);
    return newDev;
  };

  const toggleProviderMode = (deviceId: string, enabled: boolean) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, providerEnabled: enabled } : d));
  };

  const addSharePolicy = (providerId: string, recipientName: string, recipientEmail: string, maxBandwidthMbps?: number) => {
    const newPolicy: SharingPolicy = {
      id: `sh-${Date.now().toString(36)}`,
      providerDeviceId: providerId,
      recipientIdentifier: recipientEmail,
      recipientName,
      status: 'active',
      maxBandwidthMbps: maxBandwidthMbps || 50,
      usedTodayBytes: 0,
      allowLocalLANAccess: true,
      allowDNSForwarding: true,
      createdAt: new Date().toISOString(),
    };
    setShares(prev => [newPolicy, ...prev]);
  };

  const revokeSharePolicy = (shareId: string) => {
    setShares(prev => prev.map(s => s.id === shareId ? { ...s, status: 'revoked' } : s));
  };

  return (
    <NetworkContext.Provider
      value={{
        devices,
        activeSession,
        shares,
        relays,
        isConnecting,
        connectionStepLog,
        connectToProvider,
        disconnectTunnel,
        registerDevice,
        toggleProviderMode,
        addSharePolicy,
        revokeSharePolicy,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
