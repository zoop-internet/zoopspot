import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../crypto/crypto_service.dart';
import 'i_secure_storage_service.dart';

export 'i_secure_storage_service.dart';

class SecureStorageService implements ISecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
                resetOnError: false,
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
  static const _keyIsBackedUp = 'zoop_is_backed_up';

  static const String defaultCloudUrl = 'http://10.250.0.12:8080';

  /// Persists full cryptographic identity bundle locally.
  @override
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
  @override
  Future<void> setRegistrationStatus({
    required String endpointId,
    required bool isRegistered,
  }) async {
    await _storage.write(key: _keyEndpointId, value: endpointId);
    await _storage.write(key: _keyIsRegistered, value: isRegistered.toString());
  }

  @override
  Future<String?> getZoopId() => _storage.read(key: _keyZoopId);
  @override
  Future<String?> getEndpointId() => _storage.read(key: _keyEndpointId);
  @override
  Future<String?> getDeviceName() => _storage.read(key: _keyDeviceName);
  @override
  Future<String?> getEd25519PublicKeyBase64() => _storage.read(key: _keyEd25519PubKey);
  @override
  Future<String?> getEd25519SeedBase64() => _storage.read(key: _keyEd25519Seed);
  @override
  Future<String?> getWireGuardPublicKeyBase64() => _storage.read(key: _keyWireGuardPubKey);
  @override
  Future<String?> getWireGuardPrivateKeyBase64() => _storage.read(key: _keyWireGuardPrivKey);

  @override
  Future<List<int>?> getEd25519SeedBytes() async {
    final b64 = await getEd25519SeedBase64();
    if (b64 == null || b64.isEmpty) return null;
    return base64.decode(b64);
  }

  @override
  Future<String> getCloudUrl() async {
    final url = await _storage.read(key: _keyCloudUrl);
    return (url != null && url.isNotEmpty) ? url : defaultCloudUrl;
  }

  @override
  Future<void> setCloudUrl(String url) => _storage.write(key: _keyCloudUrl, value: url);

  @override
  Future<bool> isRegistered() async {
    final val = await _storage.read(key: _keyIsRegistered);
    return val == 'true';
  }

  @override
  Future<bool> hasIdentity() async {
    final key = await getEd25519PublicKeyBase64();
    return key != null && key.isNotEmpty;
  }

  @override
  Future<bool> isBackedUp() async {
    final val = await _storage.read(key: _keyIsBackedUp);
    return val == 'true';
  }

  @override
  Future<void> setBackedUp(bool backedUp) =>
      _storage.write(key: _keyIsBackedUp, value: backedUp.toString());

  static const _keyProviderScope = 'zoop_provider_scope';
  static const _keyProviderPauseCellular = 'zoop_provider_pause_cellular';
  static const _keyProviderPauseBattery = 'zoop_provider_pause_battery';
  static const _keyProviderBandwidthLimit = 'zoop_provider_bandwidth_limit';

  @override
  Future<String?> getProviderSharingScope() => _storage.read(key: _keyProviderScope);
  @override
  Future<void> setProviderSharingScope(String scope) =>
      _storage.write(key: _keyProviderScope, value: scope);

  @override
  Future<bool> getProviderPauseOnCellular() async {
    final val = await _storage.read(key: _keyProviderPauseCellular);
    return val != 'false'; // default true
  }
  @override
  Future<void> setProviderPauseOnCellular(bool val) =>
      _storage.write(key: _keyProviderPauseCellular, value: val.toString());

  @override
  Future<bool> getProviderPauseOnLowBattery() async {
    final val = await _storage.read(key: _keyProviderPauseBattery);
    return val != 'false'; // default true
  }
  @override
  Future<void> setProviderPauseOnLowBattery(bool val) =>
      _storage.write(key: _keyProviderPauseBattery, value: val.toString());

  @override
  Future<int> getProviderBandwidthLimit() async {
    final val = await _storage.read(key: _keyProviderBandwidthLimit);
    return val != null ? (int.tryParse(val) ?? 50) : 50;
  }
  @override
  Future<void> setProviderBandwidthLimit(int limit) =>
      _storage.write(key: _keyProviderBandwidthLimit, value: limit.toString());

  static const _keyPin = 'zoop_security_pin';

  @override
  Future<String?> getPin() => _storage.read(key: _keyPin);
  @override
  Future<void> savePin(String pin) => _storage.write(key: _keyPin, value: pin);

  @override
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}

