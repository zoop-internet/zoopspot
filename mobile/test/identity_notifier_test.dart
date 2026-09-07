import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/features/identity/application/identity_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('IdentityNotifier Tests', () {
    late SecureStorageService storageService;
    late CryptoService cryptoService;

    setUp(() async {
      FlutterSecureStorage.setMockInitialValues({});
      storageService = SecureStorageService();
      cryptoService = CryptoService();
    });

    test('createAndRegister succeeds and updates reactive state', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/v1/devices' && request.method == 'POST') {
          return http.Response(
            json.encode({
              'id': 'd3b07384-d113-4632-b7e1-5e921d7b001a',
              'endpoint_id': 'd3b07384-d113-4632-b7e1-5e921d7b001a',
              'status': 'trusted',
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

      final notifier = IdentityNotifier(
        storageService: storageService,
        cryptoService: cryptoService,
        cloudApiClient: apiClient,
      );

      final success = await notifier.createAndRegister(deviceName: 'Test Phone');
      expect(success, isTrue);

      final state = notifier.state;
      expect(state.isRegistered, isTrue);
      expect(state.deviceName, 'Test Phone');
      expect(state.zoopId!.startsWith('ZP-'), isTrue);
      expect(state.endpointId, 'd3b07384-d113-4632-b7e1-5e921d7b001a');
      expect(state.cloudStatus, 'trusted');

      // Verify persistence in storage
      final storedZoopId = await storageService.getZoopId();
      expect(storedZoopId, state.zoopId);
      final isRegistered = await storageService.isRegistered();
      expect(isRegistered, isTrue);
    });

    test('createAndRegister handles API errors gracefully', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode({
            'error': {
              'code': 'bad_request',
              'message': 'Public key rejected',
            }
          }),
          400,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final apiClient = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final notifier = IdentityNotifier(
        storageService: storageService,
        cryptoService: cryptoService,
        cloudApiClient: apiClient,
      );

      final success = await notifier.createAndRegister(deviceName: 'Failing Phone');
      expect(success, isFalse);
      expect(notifier.state.isRegistered, isFalse);
      expect(notifier.state.errorMessage, contains('Public key rejected'));
    });
  });
}
