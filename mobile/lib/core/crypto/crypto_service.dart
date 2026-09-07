import 'dart:convert';
import 'package:crypto/crypto.dart' as dart_crypto;
import 'package:cryptography/cryptography.dart';

/// Holds a generated Ed25519 identity keypair, WireGuard keypair, and Zoop ID.
class IdentityKeyPairBundle {
  final String zoopId;
  final List<int> ed25519PublicKeyBytes;
  final List<int> ed25519SeedBytes;
  final List<int> wireGuardPublicKeyBytes;
  final List<int> wireGuardPrivateKeyBytes;

  IdentityKeyPairBundle({
    required this.zoopId,
    required this.ed25519PublicKeyBytes,
    required this.ed25519SeedBytes,
    required this.wireGuardPublicKeyBytes,
    required this.wireGuardPrivateKeyBytes,
  });

  String get ed25519PublicKeyBase64 => base64.encode(ed25519PublicKeyBytes);
  String get ed25519SeedBase64 => base64.encode(ed25519SeedBytes);
  String get wireGuardPublicKeyBase64 => base64.encode(wireGuardPublicKeyBytes);
  String get wireGuardPrivateKeyBase64 => base64.encode(wireGuardPrivateKeyBytes);
}

class CryptoService {
  final Ed25519 _ed25519 = Ed25519();
  final X25519 _x25519 = X25519();

  /// Derives a short, human-friendly Zoop ID from a public key.
  /// Format: ZP-XXXXXX (6 uppercase alphanumeric characters).
  String deriveZoopId(List<int> publicKeyBytes) {
    final digest = dart_crypto.sha256.convert(publicKeyBytes);
    final hex = digest.toString().toUpperCase();
    final chars = hex.replaceAll(RegExp(r'[^0-9A-Z]'), '');
    final suffix = chars.length >= 6 ? chars.substring(0, 6) : chars.padRight(6, 'X');
    return 'ZP-$suffix';
  }

  /// Generates a fresh Ed25519 identity keypair and X25519 WireGuard keypair.
  Future<IdentityKeyPairBundle> generateIdentityKeyPair() async {
    final edKeyPair = await _ed25519.newKeyPair();
    final edSeed = await edKeyPair.extractPrivateKeyBytes();
    return restoreIdentityFromSeed(edSeed);
  }

  /// Deterministically restores the full identity and WireGuard keypair bundle from an Ed25519 seed.
  Future<IdentityKeyPairBundle> restoreIdentityFromSeed(List<int> ed25519SeedBytes) async {
    if (ed25519SeedBytes.length != 32) {
      throw ArgumentError('Seed must be exactly 32 bytes. Received: ${ed25519SeedBytes.length}');
    }

    // 1. Recreate Ed25519 KeyPair from seed
    final edKeyPair = await _ed25519.newKeyPairFromSeed(ed25519SeedBytes);
    final edPubKey = await edKeyPair.extractPublicKey();

    // 2. Deterministically derive X25519 WireGuard KeyPair from seed
    final wgSeed = dart_crypto.sha256.convert([
      ...ed25519SeedBytes,
      ...utf8.encode('zoop_wireguard_seed_v1'),
    ]).bytes;
    final wgKeyPair = await _x25519.newKeyPairFromSeed(wgSeed);
    final wgPubKey = await wgKeyPair.extractPublicKey();
    final wgPriv = await wgKeyPair.extractPrivateKeyBytes();

    final zoopId = deriveZoopId(edPubKey.bytes);

    return IdentityKeyPairBundle(
      zoopId: zoopId,
      ed25519PublicKeyBytes: edPubKey.bytes,
      ed25519SeedBytes: ed25519SeedBytes,
      wireGuardPublicKeyBytes: wgPubKey.bytes,
      wireGuardPrivateKeyBytes: wgPriv,
    );
  }

  /// Builds the canonical payload string matching zoop-auth-v2 specification:
  /// `zoop-auth-v2|METHOD|PATH|TIMESTAMP|NONCE|BODY_HASH`
  ///
  /// - METHOD: uppercase HTTP method (GET, POST, PUT, DELETE, etc.)
  /// - PATH: request path (e.g. /v1/devices/123)
  /// - TIMESTAMP: ISO-8601 UTC timestamp string
  /// - NONCE: random UUID/string
  /// - BODY_HASH: lowercase hex SHA-256 of request body, or empty string if body is empty.
  String buildCanonicalPayload({
    required String method,
    required String path,
    required String timestampIso,
    required String nonce,
    String body = '',
  }) {
    String bodyHash = '';
    if (body.isNotEmpty) {
      final digest = dart_crypto.sha256.convert(utf8.encode(body));
      bodyHash = digest.toString().toLowerCase();
    }
    return 'zoop-auth-v2|${method.toUpperCase()}|$path|$timestampIso|$nonce|$bodyHash';
  }

  /// Signs the canonical payload using the Ed25519 private key seed.
  /// Returns raw 64-byte signature.
  Future<List<int>> signPayload({
    required List<int> privateKeySeed,
    required String canonicalPayload,
  }) async {
    final keyPair = await _ed25519.newKeyPairFromSeed(privateKeySeed);
    final signature = await _ed25519.sign(
      utf8.encode(canonicalPayload),
      keyPair: keyPair,
    );
    return signature.bytes;
  }

  /// Verifies an Ed25519 signature against a canonical payload.
  Future<bool> verifySignature({
    required List<int> publicKeyBytes,
    required String canonicalPayload,
    required List<int> signatureBytes,
  }) async {
    final pubKey = SimplePublicKey(publicKeyBytes, type: KeyPairType.ed25519);
    final sig = Signature(signatureBytes, publicKey: pubKey);
    return await _ed25519.verify(
      utf8.encode(canonicalPayload),
      signature: sig,
    );
  }
}
