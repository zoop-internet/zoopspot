enum ConnectionStatus {
  disconnected,
  connecting,
  connectedDirect,
  connectedRelay,
  roaming,
  paused,
  error;

  bool get isConnected =>
      this == ConnectionStatus.connectedDirect ||
      this == ConnectionStatus.connectedRelay;

  String get label {
    switch (this) {
      case ConnectionStatus.disconnected:
        return 'Disconnected';
      case ConnectionStatus.connecting:
        return 'Punching NAT...';
      case ConnectionStatus.connectedDirect:
        return 'Connected (Direct P2P)';
      case ConnectionStatus.connectedRelay:
        return 'Connected (Encrypted Relay)';
      case ConnectionStatus.roaming:
        return 'Roaming Network...';
      case ConnectionStatus.paused:
        return 'Paused';
      case ConnectionStatus.error:
        return 'Connection Error';
    }
  }
}

class TelemetryMetrics {
  final int rxBytes;
  final int txBytes;
  final int pingMs;
  final String activeEndpoint;
  final String protocol;

  const TelemetryMetrics({
    this.rxBytes = 0,
    this.txBytes = 0,
    this.pingMs = 0,
    this.activeEndpoint = '',
    this.protocol = 'WireGuard Noise_IK',
  });
}
