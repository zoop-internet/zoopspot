import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';

void main() {
  group('CryptoService Tests', () {
    late CryptoService cryptoService;

    setUp(() {
      cryptoService = CryptoService();
    });

    test('generateIdentityKeyPair produces valid keys and Zoop ID', () async {
      final bundle = await cryptoService.generateIdentityKeyPair();

      expect(bundle.zoopId.startsWith('ZP-'), isTrue);
      expect(bundle.zoopId.length, 9); // 'ZP-' + 6 chars
      expect(bundle.ed25519PublicKeyBytes.length, 32);
      expect(bundle.ed25519SeedBytes.length, 32);
      expect(bundle.wireGuardPublicKeyBytes.length, 32);
      expect(bundle.wireGuardPrivateKeyBytes.length, 32);

      // Verify base64 encoding produces expected output
      expect(base64.decode(bundle.ed25519PublicKeyBase64).length, 32);
      expect(base64.decode(bundle.wireGuardPublicKeyBase64).length, 32);
    });

    test('buildCanonicalPayload formats correctly for empty and non-empty body', () {
      final p1 = cryptoService.buildCanonicalPayload(
        method: 'get',
        path: '/v1/devices/abc-123',
        timestampIso: '2026-09-07T08:00:00Z',
        nonce: 'test-nonce-1',
      );
      expect(p1, 'zoop-auth-v2|GET|/v1/devices/abc-123|2026-09-07T08:00:00Z|test-nonce-1|');

      final p2 = cryptoService.buildCanonicalPayload(
        method: 'post',
        path: '/v1/connections',
        timestampIso: '2026-09-07T08:00:00Z',
        nonce: 'test-nonce-2',
        body: '{"test":true}',
      );
      expect(p2.startsWith('zoop-auth-v2|POST|/v1/connections|2026-09-07T08:00:00Z|test-nonce-2|'), isTrue);
      // Ensure body hash is 64 hex characters (SHA256)
      final parts = p2.split('|');
      expect(parts.length, 6);
      expect(parts[5].length, 64);
    });

    test('signPayload generates valid signature that verifies successfully', () async {
      final bundle = await cryptoService.generateIdentityKeyPair();
      final payload = cryptoService.buildCanonicalPayload(
        method: 'GET',
        path: '/v1/shares',
        timestampIso: '2026-09-07T08:00:00Z',
        nonce: 'nonce-123',
      );

      final signatureBytes = await cryptoService.signPayload(
        privateKeySeed: bundle.ed25519SeedBytes,
        canonicalPayload: payload,
      );

      expect(signatureBytes.length, 64);

      final isValid = await cryptoService.verifySignature(
        publicKeyBytes: bundle.ed25519PublicKeyBytes,
        canonicalPayload: payload,
        signatureBytes: signatureBytes,
      );

      expect(isValid, isTrue);

      // Verify tampered payload fails
      final isTamperedValid = await cryptoService.verifySignature(
        publicKeyBytes: bundle.ed25519PublicKeyBytes,
        canonicalPayload: '$payload-tampered',
        signatureBytes: signatureBytes,
      );
      expect(isTamperedValid, isFalse);
    });

    test('restoreIdentityFromSeed deterministically recreates the identical keypair and Zoop ID', () async {
      final original = await cryptoService.generateIdentityKeyPair();
      final restored = await cryptoService.restoreIdentityFromSeed(original.ed25519SeedBytes);

      expect(restored.zoopId, equals(original.zoopId));
      expect(restored.ed25519PublicKeyBytes, equals(original.ed25519PublicKeyBytes));
      expect(restored.ed25519SeedBytes, equals(original.ed25519SeedBytes));
      expect(restored.wireGuardPublicKeyBytes, equals(original.wireGuardPublicKeyBytes));
      expect(restored.wireGuardPrivateKeyBytes, equals(original.wireGuardPrivateKeyBytes));
    });
  });
}
