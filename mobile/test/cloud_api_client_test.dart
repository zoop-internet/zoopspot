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
  });
}
