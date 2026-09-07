import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';

void main() {
  group('CloudApiClient Tests', () {
    late CryptoService cryptoService;

    setUp(() {
      cryptoService = CryptoService();
    });

    test('registerDevice posts valid payload and parses response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/devices');
        expect(request.method, 'POST');
        expect(request.headers['Content-Type'], 'application/json');

        final body = json.decode(request.body) as Map<String, dynamic>;
        expect(body['name'], 'Pixel 8');
        expect(body['platform'], 'android');
        expect(body['public_key'], 'test-ed-key');
        expect(body['wireguard_public_key'], 'test-wg-key');

        return http.Response(
          json.encode({
            'id': 'd3b07384-d113-4632-b7e1-5e921d7b001a',
            'endpoint_id': 'd3b07384-d113-4632-b7e1-5e921d7b001a',
            'status': 'trusted',
          }),
          201,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final resp = await client.registerDevice(
        name: 'Pixel 8',
        ed25519PublicKeyB64: 'test-ed-key',
        wireguardPublicKeyB64: 'test-wg-key',
      );

      expect(resp.id, 'd3b07384-d113-4632-b7e1-5e921d7b001a');
      expect(resp.endpointId, 'd3b07384-d113-4632-b7e1-5e921d7b001a');
      expect(resp.status, 'trusted');
    });

    test('authenticatedRequest attaches valid zoop-auth-v2 headers', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'd3b07384-d113-4632-b7e1-5e921d7b001a';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/devices/$endpointId');
        expect(request.method, 'GET');

        // Check required zoop-auth-v2 headers
        expect(request.headers['X-Zoop-Identity'], endpointId);
        expect(request.headers['X-Zoop-Signature'], isNotEmpty);
        expect(request.headers['X-Zoop-Timestamp'], isNotEmpty);
        expect(request.headers['X-Zoop-Nonce'], isNotEmpty);

        // Verify signature matches canonical payload
        final canonical = cryptoService.buildCanonicalPayload(
          method: 'GET',
          path: '/v1/devices/$endpointId',
          timestampIso: request.headers['X-Zoop-Timestamp']!,
          nonce: request.headers['X-Zoop-Nonce']!,
          body: '',
        );

        final sigBytes = base64.decode(request.headers['X-Zoop-Signature']!);
        final isValid = await cryptoService.verifySignature(
          publicKeyBytes: keyBundle.ed25519PublicKeyBytes,
          canonicalPayload: canonical,
          signatureBytes: sigBytes,
        );
        expect(isValid, isTrue);

        return http.Response(
          json.encode({
            'id': endpointId,
            'name': 'Pixel 8',
            'status': 'trusted',
          }),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final resp = await client.getDevice(
        endpointId: endpointId,
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(resp['id'], endpointId);
      expect(resp['name'], 'Pixel 8');
    });

    test('throws CloudApiException on error responses', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          json.encode({
            'error': {
              'code': 'device_not_found',
              'message': 'The specified device was not found',
            },
          }),
          404,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      expect(
        () => client.authenticatedRequest(
          method: 'GET',
          path: '/v1/devices/nonexistent',
          endpointId: '00000000-0000-0000-0000-000000000000',
          privateKeySeed: List.filled(32, 0),
        ),
        throwsA(isA<CloudApiException>().having((e) => e.code, 'code', 'device_not_found')),
      );
    });

    test('listDevices parses device list successfully', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'self-endpoint-id';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/devices');
        expect(request.method, 'GET');
        return http.Response(
          json.encode([
            {
              'id': 'peer-1',
              'endpoint_id': 'peer-1',
              'name': 'Frankfurt Gateway',
              'os': 'linux',
              'status': 'trusted',
            },
            {
              'id': 'peer-2',
              'endpoint_id': 'peer-2',
              'name': 'Office Mac',
              'os': 'darwin',
              'status': 'trusted',
            },
          ]),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final devices = await client.listDevices(
        endpointId: endpointId,
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(devices.length, 2);
      expect(devices[0].name, 'Frankfurt Gateway');
      expect(devices[0].platform, 'linux');
      expect(devices[1].name, 'Office Mac');
    });

    test('getDeviceEndpoints retrieves wireguard key and candidates', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'self-endpoint-id';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/devices/peer-1/endpoints');
        return http.Response(
          json.encode({
            'device_id': 'peer-1',
            'wireguard_public_key': 'test-wireguard-pubkey',
            'endpoints': ['3.70.135.200:51820', '192.168.1.10:51820'],
          }),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final endpointsData = await client.getDeviceEndpoints(
        endpointId: endpointId,
        targetDeviceId: 'peer-1',
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(endpointsData['wireguard_public_key'], 'test-wireguard-pubkey');
      expect((endpointsData['endpoints'] as List).length, 2);
    });

    test('createPairingToken posts request and parses code', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'self-endpoint-id';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/pairing/token');
        expect(request.method, 'POST');
        return http.Response(
          json.encode({
            'code': 'ZP-ABC123',
            'endpoint_id': endpointId,
            'expires_at': '2026-09-07T14:00:00Z',
          }),
          201,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final tokenData = await client.createPairingToken(
        endpointId: endpointId,
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(tokenData['code'], 'ZP-ABC123');
      expect(tokenData['endpoint_id'], endpointId);
    });

    test('claimPairingToken claims code and returns paired device details', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'self-endpoint-id';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/pairing/claim');
        expect(request.method, 'POST');
        final body = json.decode(request.body) as Map<String, dynamic>;
        expect(body['code'], 'ZP-ABC123');
        return http.Response(
          json.encode({
            'success': true,
            'paired_device_id': 'peer-router',
            'paired_device_name': 'Home Router',
          }),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final claimData = await client.claimPairingToken(
        endpointId: endpointId,
        code: 'ZP-ABC123',
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(claimData['success'], isTrue);
      expect(claimData['paired_device_name'], 'Home Router');
    });

    test('getFleetDevices retrieves list of paired devices', () async {
      final keyBundle = await cryptoService.generateIdentityKeyPair();
      const endpointId = 'self-endpoint-id';

      final mockClient = MockClient((request) async {
        expect(request.url.path, '/v1/devices/$endpointId/fleet');
        expect(request.method, 'GET');
        return http.Response(
          json.encode([
            {'id': endpointId, 'name': 'Pixel 8', 'is_self': true},
            {'id': 'peer-router', 'name': 'Home Router', 'is_self': false},
          ]),
          200,
          headers: {'Content-Type': 'application/json'},
        );
      });

      final client = CloudApiClient(
        baseUrl: 'https://test.zoop.network',
        client: mockClient,
        cryptoService: cryptoService,
      );

      final fleet = await client.getFleetDevices(
        endpointId: endpointId,
        privateKeySeed: keyBundle.ed25519SeedBytes,
      );

      expect(fleet.length, 2);
      expect(fleet[0]['name'], 'Pixel 8');
      expect(fleet[1]['name'], 'Home Router');
    });
  });
}
