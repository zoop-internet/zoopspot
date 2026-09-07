import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/features/pairing/application/pairing_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('PairingNotifier Tests', () {
    late SecureStorageService storageService;
    late CryptoService cryptoService;

    const myEndpointId = 'self-endpoint-11111';

    setUp(() async {
      FlutterSecureStorage.setMockInitialValues({});
      storageService = SecureStorageService();
      cryptoService = CryptoService();

      final bundle = await cryptoService.generateIdentityKeyPair();
      await storageService.saveIdentityBundle(
        bundle: bundle,
        deviceName: 'Pixel 8',
        endpointId: myEndpointId,
        isRegistered: true,
      );
    });

    test('generateToken requests ephemeral token from cloud and sets state', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/v1/pairing/token' && request.method == 'POST') {
          return http.Response(
            json.encode({
              'code': 'ZP-9X4K2P',
              'endpoint_id': myEndpointId,
              'zoop_id': 'ZP-TESTID',
              'cloud_url': 'https://test.zoop.network',
              'expires_at': DateTime.now().add(const Duration(minutes: 10)).toIso8601String(),
            }),
            201,
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

      final notifier = PairingNotifier(
        cloudApiClient: apiClient,
        storageService: storageService,
      );

      await notifier.generateToken();

      expect(notifier.state.isGenerating, isFalse);
      expect(notifier.state.errorMessage, isNull);
      expect(notifier.state.activeCode, 'ZP-9X4K2P');
      expect(notifier.state.expiresAt, isNotNull);
      expect(notifier.state.isExpired, isFalse);
    });

    test('claimToken links remote device and updates fleet', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/v1/pairing/claim' && request.method == 'POST') {
          return http.Response(
            json.encode({
              'success': true,
              'paired_device_id': 'router-endpoint-22222',
              'paired_device_name': 'OpenWrt Home Router',
              'message': 'Successfully paired with OpenWrt Home Router',
            }),
            200,
            headers: {'Content-Type': 'application/json'},
          );
        }
        if (request.url.path == '/v1/devices/$myEndpointId/fleet' && request.method == 'GET') {
          return http.Response(
            json.encode([
              {
                'id': myEndpointId,
                'name': 'Pixel 8 (This Device)',
                'platform': 'android',
                'status': 'trusted',
                'is_self': true,
                'paired_at': DateTime.now().toIso8601String(),
              },
              {
                'id': 'router-endpoint-22222',
                'name': 'OpenWrt Home Router',
                'platform': 'openwrt',
                'status': 'trusted',
                'is_self': false,
                'paired_at': DateTime.now().toIso8601String(),
              }
            ]),
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

      final notifier = PairingNotifier(
        cloudApiClient: apiClient,
        storageService: storageService,
      );

      final success = await notifier.claimToken('ZP-9X4K2P');
      expect(success, isTrue);
      expect(notifier.state.isClaiming, isFalse);
      expect(notifier.state.successMessage, contains('OpenWrt Home Router'));
      expect(notifier.state.fleetDevices.length, 2);
    });

    test('claimToken handles invalid or expired code errors', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode({
            'error': {
              'code': 'not_found',
              'message': 'invalid or expired pairing code',
            }
          }),
          404,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final apiClient = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final notifier = PairingNotifier(
        cloudApiClient: apiClient,
        storageService: storageService,
      );

      final success = await notifier.claimToken('ZP-EXPIRE');
      expect(success, isFalse);
      expect(notifier.state.isClaiming, isFalse);
      expect(notifier.state.errorMessage, contains('invalid or expired'));
    });
  });
}
