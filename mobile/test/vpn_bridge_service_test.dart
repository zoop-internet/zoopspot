import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:zoop_mobile/core/vpn/vpn_bridge_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('VpnBridgeService Tests', () {
    late VpnBridgeService vpnService;
    final List<MethodCall> log = [];

    setUp(() {
      vpnService = VpnBridgeService();
      log.clear();

      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
        const MethodChannel('network.zoop.app/vpn'),
        (MethodCall methodCall) async {
          log.add(methodCall);
          switch (methodCall.method) {
            case 'prepareVpn':
              return true;
            case 'startTunnel':
              return true;
            case 'startTunnelZeroBalance':
              return true;
            case 'stopTunnel':
              return true;
            case 'getStatus':
              return true;
            default:
              return null;
          }
        },
      );
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
        const MethodChannel('network.zoop.app/vpn'),
        null,
      );
    });

    test('prepareVpn invokes native platform method', () async {
      final prepared = await vpnService.prepareVpn();
      expect(prepared, isTrue);
      expect(log, hasLength(1));
      expect(log.first.method, 'prepareVpn');
    });

    test('startTunnel sends peer arguments to native service', () async {
      final started = await vpnService.startTunnel(
        peerKey: 'peer-pub-key-123',
        candidatesJson: '[{"ip":"1.2.3.4"}]',
        relayUrl: 'wss://relay.zoop.network',
      );
      expect(started, isTrue);
      expect(log.last.method, 'startTunnel');
      expect(log.last.arguments['peerKey'], 'peer-pub-key-123');
      expect(log.last.arguments['candidates'], '[{"ip":"1.2.3.4"}]');
      expect(log.last.arguments['relayUrl'], 'wss://relay.zoop.network');
    });

    test('startTunnelZeroBalance sends zero-balance parameters to native service', () async {
      final started = await vpnService.startTunnelZeroBalance(
        peerKey: 'peer-pub-key-123',
        peerEndpointId: 'ep-abc-123',
        candidatesJson: '[{"ip":"1.2.3.4"}]',
        relayUrl: 'wss://relay.zoop.network',
        carrierKey: 'mtn-ug',
        routingMode: 'full',
      );
      expect(started, isTrue);
      expect(log.last.method, 'startTunnelZeroBalance');
      expect(log.last.arguments['peerKey'], 'peer-pub-key-123');
      expect(log.last.arguments['peerEndpointId'], 'ep-abc-123');
      expect(log.last.arguments['carrierKey'], 'mtn-ug');
      expect(log.last.arguments['routingMode'], 'full');
    });

    test('stopTunnel invokes native stop method', () async {
      final stopped = await vpnService.stopTunnel();
      expect(stopped, isTrue);
      expect(log.last.method, 'stopTunnel');
    });

    test('isTunnelRunning queries native status', () async {
      final running = await vpnService.isTunnelRunning();
      expect(running, isTrue);
      expect(log.last.method, 'getStatus');
    });
  });
}
