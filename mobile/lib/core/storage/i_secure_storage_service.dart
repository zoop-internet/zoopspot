import '../crypto/crypto_service.dart';

/// Abstract contract for hardware-backed secure storage.
abstract class ISecureStorageService {
  /// Persists full cryptographic identity bundle locally.
  Future<void> saveIdentityBundle({
    required IdentityKeyPairBundle bundle,
    required String deviceName,
    String? endpointId,
    bool isRegistered = false,
  });

  /// Sets cloud registration status and endpoint ID.
  Future<void> setRegistrationStatus({
    required String endpointId,
    required bool isRegistered,
  });

  Future<String?> getZoopId();
  Future<String?> getEndpointId();
  Future<String?> getDeviceName();
  Future<String?> getEd25519PublicKeyBase64();
  Future<String?> getEd25519SeedBase64();
  Future<String?> getWireGuardPublicKeyBase64();
  Future<String?> getWireGuardPrivateKeyBase64();
  Future<List<int>?> getEd25519SeedBytes();

  Future<String> getCloudUrl();
  Future<void> setCloudUrl(String url);

  Future<bool> isRegistered();
  Future<bool> hasIdentity();
  Future<bool> isBackedUp();
  Future<void> setBackedUp(bool backedUp);

  Future<String?> getProviderSharingScope();
  Future<void> setProviderSharingScope(String scope);

  Future<bool> getProviderPauseOnCellular();
  Future<void> setProviderPauseOnCellular(bool val);

  Future<bool> getProviderPauseOnLowBattery();
  Future<void> setProviderPauseOnLowBattery(bool val);

  Future<int> getProviderBandwidthLimit();
  Future<void> setProviderBandwidthLimit(int limit);

  Future<String?> getPin();
  Future<void> savePin(String pin);

  Future<bool> getZeroBalanceEnabled();
  Future<void> setZeroBalanceEnabled(bool val);
  Future<String> getZeroBalanceCarrier();
  Future<void> setZeroBalanceCarrier(String carrier);

  Future<void> clearAll();
}
