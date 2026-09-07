import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../crypto/crypto_service.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  static const _keyZoopId = 'zoop_identity_id';
  static const _keyEndpointId = 'zoop_endpoint_id';
  static const _keyDeviceName = 'zoop_device_name';
  static const _keyEd25519PubKey = 'zoop_ed25519_pubkey_b64';
  static const _keyEd25519Seed = 'zoop_ed25519_seed_b64';
  static const _keyWireGuardPubKey = 'zoop_wireguard_pubkey_b64';
  static const _keyWireGuardPrivKey = 'zoop_wireguard_privkey_b64';
  static const _keyCloudUrl = 'zoop_cloud_url';
  static const _keyIsRegistered = 'zoop_is_registered';

  static const String defaultCloudUrl = 'https://3.70.135.200.sslip.io';

  /// Persists full cryptographic identity bundle locally.
  Future<void> saveIdentityBundle({
    required IdentityKeyPairBundle bundle,
    required String deviceName,
    String? endpointId,
    bool isRegistered = false,
  }) async {
    await _storage.write(key: _keyZoopId, value: bundle.zoopId);
    await _storage.write(key: _keyDeviceName, value: deviceName);
    await _storage.write(key: _keyEd25519PubKey, value: bundle.ed25519PublicKeyBase64);
    await _storage.write(key: _keyEd25519Seed, value: bundle.ed25519SeedBase64);
    await _storage.write(key: _keyWireGuardPubKey, value: bundle.wireGuardPublicKeyBase64);
    await _storage.write(key: _keyWireGuardPrivKey, value: bundle.wireGuardPrivateKeyBase64);
    if (endpointId != null) {
      await _storage.write(key: _keyEndpointId, value: endpointId);
    }
    await _storage.write(key: _keyIsRegistered, value: isRegistered.toString());
  }

  /// Sets cloud registration status and endpoint ID.
  Future<void> setRegistrationStatus({
    required String endpointId,
    required bool isRegistered,
  }) async {
    await _storage.write(key: _keyEndpointId, value: endpointId);
    await _storage.write(key: _keyIsRegistered, value: isRegistered.toString());
  }

  Future<String?> getZoopId() => _storage.read(key: _keyZoopId);
  Future<String?> getEndpointId() => _storage.read(key: _keyEndpointId);
  Future<String?> getDeviceName() => _storage.read(key: _keyDeviceName);
  Future<String?> getEd25519PublicKeyBase64() => _storage.read(key: _keyEd25519PubKey);
  Future<String?> getEd25519SeedBase64() => _storage.read(key: _keyEd25519Seed);
  Future<String?> getWireGuardPublicKeyBase64() => _storage.read(key: _keyWireGuardPubKey);
  Future<String?> getWireGuardPrivateKeyBase64() => _storage.read(key: _keyWireGuardPrivKey);

  Future<List<int>?> getEd25519SeedBytes() async {
    final b64 = await getEd25519SeedBase64();
    if (b64 == null || b64.isEmpty) return null;
    return base64.decode(b64);
  }

  Future<String> getCloudUrl() async {
    final url = await _storage.read(key: _keyCloudUrl);
    return (url != null && url.isNotEmpty) ? url : defaultCloudUrl;
  }

  Future<void> setCloudUrl(String url) => _storage.write(key: _keyCloudUrl, value: url);

  Future<bool> isRegistered() async {
    final val = await _storage.read(key: _keyIsRegistered);
    return val == 'true';
  }

  Future<bool> hasIdentity() async {
    final key = await getEd25519PublicKeyBase64();
    return key != null && key.isNotEmpty;
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
