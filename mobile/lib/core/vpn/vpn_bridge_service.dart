import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final vpnBridgeServiceProvider = Provider<VpnBridgeService>((ref) {
  return VpnBridgeService();
});

class VpnBridgeService {
  static const MethodChannel _methodChannel =
      MethodChannel('network.zoop.app/vpn');
  static const EventChannel _eventChannel =
      EventChannel('network.zoop.app/vpn_events');

  Stream<Map<dynamic, dynamic>>? _eventsStream;

  /// Requests or confirms Android VPN preparation and user permission consent.
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

  /// Starts the Android native ZoopVpnService with peer connection parameters.
  Future<bool> startTunnel({
    String? peerKey,
    String? candidatesJson,
    String? relayUrl,
  }) async {
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('startTunnel', {
        'peerKey': peerKey ?? '',
        'candidates': candidatesJson ?? '[]',
        'relayUrl': relayUrl ?? '',
      });
      return result ?? false;
    } on MissingPluginException {
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Disconnects and shuts down the native VPN service.
  Future<bool> stopTunnel() async {
    try {
      final bool? result =
          await _methodChannel.invokeMethod<bool>('stopTunnel');
      return result ?? false;
    } on MissingPluginException {
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Returns whether the native VPN service is currently active.
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
  Stream<Map<dynamic, dynamic>> get vpnEvents {
    _eventsStream ??= _eventChannel
        .receiveBroadcastStream()
        .map((event) => event as Map<dynamic, dynamic>);
    return _eventsStream!;
  }
}
