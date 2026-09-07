import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/models/peer_device.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/features/dashboard/application/peers_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('PeersNotifier Tests', () {
    late SecureStorageService storageService;
    late CryptoService cryptoService;

    const myEndpointId = 'self-endpoint-12345';
    const remotePeerId1 = 'peer-endpoint-67890';
    const remotePeerId2 = 'peer-endpoint-abcdef';

    setUp(() async {
      FlutterSecureStorage.setMockInitialValues({});
      storageService = SecureStorageService();
      cryptoService = CryptoService();

      final bundle = await cryptoService.generateIdentityKeyPair();
      await storageService.saveIdentityBundle(
        bundle: bundle,
        deviceName: 'Local Phone',
        endpointId: myEndpointId,
        isRegistered: true,
      );
    });

    test('loadPeers fetches devices, filters out self, and selects default peer', () async {
      final mockDevicesJson = [
        {
          'id': myEndpointId,
          'endpoint_id': myEndpointId,
          'name': 'Local Phone',
          'platform': 'android',
          'status': 'trusted',
          'online': true,
          'endpoints': ['192.168.1.100:51820'],
          'wireguard_public_key': 'self-wg-key',
        },
        {
          'id': remotePeerId1,
          'endpoint_id': remotePeerId1,
          'name': 'Berlin Gateway',
          'platform': 'linux',
          'status': 'trusted',
          'online': true,
          'endpoints': ['198.51.100.1:51820'],
          'wireguard_public_key': 'berlin-wg-key',
        },
        {
          'id': remotePeerId2,
          'endpoint_id': remotePeerId2,
          'name': 'Home Router',
          'platform': 'openwrt',
          'status': 'trusted',
          'online': false,
          'endpoints': ['203.0.113.5:51820'],
          'wireguard_public_key': 'router-wg-key',
        },
      ];

      final mockClient = MockClient((request) async {
        if (request.url.path == '/v1/devices' && request.method == 'GET') {
          return http.Response(
            json.encode(mockDevicesJson),
            200,
            headers: {'Content-Type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final notifier = PeersNotifier(
        cloudApiClient: apiClient,
        storageService: storageService,
      );

      await notifier.loadPeers();

      final state = notifier.state;
      expect(state.isLoading, isFalse);
      expect(state.errorMessage, isNull);
      // Self should be excluded from peer list
      expect(state.peers.length, 2);
      expect(state.peers.any((p) => p.endpointId == myEndpointId), isFalse);
      expect(state.peers[0].name, 'Berlin Gateway');
      expect(state.peers[1].name, 'Home Router');

      // First peer selected automatically
      expect(state.selectedPeer, isNotNull);
      expect(state.selectedPeer!.endpointId, remotePeerId1);
      expect(state.selectedPeer!.name, 'Berlin Gateway');
    });

    test('selectPeer updates selectedPeer', () async {
      final notifier = PeersNotifier(
        cloudApiClient: CloudApiClient(
          baseUrl: 'https://test.zoop.network',
          client: MockClient((_) async => http.Response('[]', 200)),
          cryptoService: cryptoService,
        ),
        storageService: storageService,
      );

      final peer = const PeerDevice(
        id: remotePeerId2,
        endpointId: remotePeerId2,
        name: 'Home Router',
        platform: 'openwrt',
      );

      notifier.selectPeer(peer);
      expect(notifier.state.selectedPeer, equals(peer));
    });

    test('resolvePeerDetails fetches candidate endpoints and public key', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/v1/devices/$remotePeerId1/endpoints' &&
            request.method == 'GET') {
          return http.Response(
            json.encode({
              'device_id': remotePeerId1,
              'wireguard_public_key': 'resolved-berlin-wg-key',
              'endpoints': ['198.51.100.1:51820', '10.0.0.1:51820'],
            }),
            200,
            headers: {'Content-Type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final notifier = PeersNotifier(
        cloudApiClient: apiClient,
        storageService: storageService,
      );

      const initialPeer = PeerDevice(
        id: remotePeerId1,
        endpointId: remotePeerId1,
        name: 'Berlin Gateway',
        platform: 'linux',
      );

      final resolved = await notifier.resolvePeerDetails(initialPeer);
      expect(resolved, isNotNull);
      expect(resolved!.wireguardPublicKey, 'resolved-berlin-wg-key');
      expect(resolved.endpoints, contains('198.51.100.1:51820'));
      expect(resolved.endpoints, contains('10.0.0.1:51820'));
    });
  });
}
