import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );

  static const _keyZoopId = 'zoop_identity_id';
  static const _keyPublicKey = 'zoop_public_key';
  static const _keyPrivateKey = 'zoop_private_key';
  static const _keyDeviceName = 'zoop_device_name';

  Future<void> saveIdentity({
    required String zoopId,
    required String publicKeyHex,
    required String privateKeyHex,
    required String deviceName,
  }) async {
    await _storage.write(key: _keyZoopId, value: zoopId);
    await _storage.write(key: _keyPublicKey, value: publicKeyHex);
    await _storage.write(key: _keyPrivateKey, value: privateKeyHex);
    await _storage.write(key: _keyDeviceName, value: deviceName);
  }

  Future<String?> getZoopId() => _storage.read(key: _keyZoopId);
  Future<String?> getPublicKey() => _storage.read(key: _keyPublicKey);
  Future<String?> getPrivateKey() => _storage.read(key: _keyPrivateKey);
  Future<String?> getDeviceName() => _storage.read(key: _keyDeviceName);

  Future<bool> hasIdentity() async {
    final key = await getPublicKey();
    return key != null && key.isNotEmpty;
  }

  Future<void> clearIdentity() async {
    await _storage.deleteAll();
  }
}
