import 'dart:async';

/// Abstract contract for native VPN bridge communications.
abstract class IVpnBridgeService {
  /// Requests or confirms Android VPN preparation and user permission consent.
  Future<bool> prepareVpn();

  /// Starts the native VPN service with peer connection parameters and routing policy.
  Future<bool> startTunnel({
    String? peerKey,
    String? privateKey,
    String? candidatesJson,
    String? relayUrl,
    String routingMode = 'full',
    String? clientIp,
  });

  /// Disconnects and shuts down the native VPN service.
  Future<bool> stopTunnel();

  /// Returns whether the native VPN service is currently active.
  Future<bool> isTunnelRunning();

  /// Real-time stream of native network events (state changes, roaming, errors).
  Stream<Map<dynamic, dynamic>> get vpnEvents;

  /// Gathers local and STUN public endpoint candidates from the native runtime.
  Future<String> getCandidates();
}
