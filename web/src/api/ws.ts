import type { ConnectionSession, ConnectionState, NetworkTelemetry } from '../types';

type TelemetryListener = (telemetry: NetworkTelemetry) => void;
type StateListener = (state: ConnectionState, stepLog?: string) => void;

export class ZoopSignalingClient {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private simulationInterval: number | null = null;

  constructor() {
    this.tryConnectWebSocket();
  }

  private tryConnectWebSocket() {
    try {
      this.ws = new WebSocket('ws://localhost:8080/v1/signaling');
      this.ws.onopen = () => {
        this.isConnected = true;
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch {
          // ignore parse error
        }
      };
      this.ws.onerror = () => {
        this.isConnected = false;
      };
      this.ws.onclose = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  private handleIncomingMessage(msg: Record<string, unknown>) {
    if (msg.type === 'telemetry') {
      this.telemetryListeners.forEach(l => l(msg.data as NetworkTelemetry));
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  onTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  onStateChange(listener: StateListener) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  // Simulate or execute full connection establishment sequence
  async initiateConnection(
    providerId: string,
    providerName: string,
    providerIP: string,
    recipientId: string,
    recipientIP: string,
    onStep: (step: string, state: ConnectionState) => void
  ): Promise<ConnectionSession> {
    onStep('Initiating secure handshake with Zoop Control Plane...', 'discovering');
    await new Promise(r => setTimeout(r, 600));

    onStep('Performing STUN discovery & gathering NAT candidates...', 'discovering');
    await new Promise(r => setTimeout(r, 700));

    onStep('Exchanging WireGuard public keys over WebSocket signaling...', 'signaling');
    await new Promise(r => setTimeout(r, 800));

    onStep('Punching UDP hole through symmetric NAT firewall...', 'punching_nat');
    await new Promise(r => setTimeout(r, 900));

    onStep('Direct WireGuard tunnel verified with authenticated peer!', 'connected_direct');

    const session: ConnectionSession = {
      id: `sess-${Date.now().toString(36)}`,
      providerId,
      providerName,
      providerIP,
      recipientId,
      recipientName: 'MacBook Pro M3 Max',
      recipientIP,
      state: 'connected_direct',
      pathType: 'direct',
      tunnelInterface: 'zoop0',
      establishedAt: new Date().toISOString(),
      durationSeconds: 0,
      dnsServers: ['1.1.1.1', '100.64.0.1'],
      allowedIPs: ['0.0.0.0/0', '::/0'],
      telemetry: {
        latencyMs: 24,
        jitterMs: 1.8,
        packetLossPercent: 0.0,
        bytesIn: 1048576,
        bytesOut: 524288,
        bandwidthInBps: 45000000,
        bandwidthOutBps: 12000000,
        currentPath: 'direct',
        natType: 'Full Cone',
        cipherSuite: 'ChaCha20-Poly1305 (WireGuard Noise Protocol)',
      },
    };

    this.startLiveTelemetrySimulation(session);
    return session;
  }

  private startLiveTelemetrySimulation(session: ConnectionSession) {
    if (this.simulationInterval) clearInterval(this.simulationInterval);

    this.simulationInterval = window.setInterval(() => {
      // Fluctuate latency and increment bytes for high-frequency telemetry
      const latDelta = (Math.random() - 0.5) * 4;
      const newLat = Math.max(12, Math.min(80, Math.round(session.telemetry.latencyMs + latDelta)));
      const inDelta = Math.floor(Math.random() * 450000) + 50000;
      const outDelta = Math.floor(Math.random() * 150000) + 10000;

      session.telemetry.latencyMs = newLat;
      session.telemetry.jitterMs = Number((Math.random() * 2.5 + 0.5).toFixed(1));
      session.telemetry.bytesIn += inDelta;
      session.telemetry.bytesOut += outDelta;
      session.telemetry.bandwidthInBps = inDelta * 8 * 2;
      session.telemetry.bandwidthOutBps = outDelta * 8 * 2;
      session.durationSeconds += 1;

      this.telemetryListeners.forEach(l => l({ ...session.telemetry }));
    }, 1000);
  }

  stopTelemetry() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

export const signalingClient = new ZoopSignalingClient();
