import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'i_vpn_bridge_service.dart';

export 'i_vpn_bridge_service.dart';

final vpnBridgeServiceProvider = Provider<IVpnBridgeService>((ref) {
  return VpnBridgeService();
});

class VpnBridgeService implements IVpnBridgeService {
  static const MethodChannel _methodChannel =
      MethodChannel('network.zoop.app/vpn');
  static const EventChannel _eventChannel =
      EventChannel('network.zoop.app/vpn_events');

  Stream<Map<dynamic, dynamic>>? _eventsStream;

  /// Requests or confirms Android VPN preparation and user permission consent.
  @override
  Future<bool> prepareVpn() async {
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('prepareVpn');
      return result ?? false;
    } on MissingPluginException {
      // Running in test / non-Android environment
      return true;
    } catch (_) {
      return false;
    }
  }

  bool _isTransitioning = false;
  bool get isTransitioning => _isTransitioning;

  /// Starts the Android native ZoopVpnService with peer connection parameters and routing policy.
  @override
  Future<bool> startTunnel({
    String? peerKey,
    String? privateKey,
    String? candidatesJson,
    String? relayUrl,
    String routingMode = 'full',
    String? clientIp,
  }) async {
    if (_isTransitioning) return false;
    _isTransitioning = true;
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('startTunnel', {
        'peerKey': peerKey ?? '',
        'privateKey': privateKey ?? '',
        'candidates': candidatesJson ?? '[]',
        'relayUrl': relayUrl ?? '',
        'routingMode': routingMode,
        'clientIp': clientIp ?? '100.64.0.2',
      });
      return result ?? false;
    } on MissingPluginException {
      return true;
    } catch (_) {
      return false;
    } finally {
      _isTransitioning = false;
    }
  }

  /// Disconnects and shuts down the native VPN service.
  @override
  Future<bool> stopTunnel() async {
    if (_isTransitioning) return false;
    _isTransitioning = true;
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('stopTunnel');
      return result ?? false;
    } on MissingPluginException {
      return true;
    } catch (_) {
      return false;
    } finally {
      _isTransitioning = false;
    }
  }

  /// Returns whether the native VPN service is currently active.
  @override
  Future<bool> isTunnelRunning() async {
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('getStatus');
      return result ?? false;
    } on MissingPluginException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Real-time stream of native network events (state changes, roaming, errors).
  @override
  Stream<Map<dynamic, dynamic>> get vpnEvents {
    _eventsStream ??= _eventChannel
        .receiveBroadcastStream()
        .map((event) => event as Map<dynamic, dynamic>);
    return _eventsStream!;
  }
}
