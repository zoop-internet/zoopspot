import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../crypto/crypto_service.dart';
import '../network/cloud_api_client.dart';
import '../storage/secure_storage_service.dart';

export '../auth/biometric_auth_service.dart' show biometricAuthServiceProvider;
export '../vpn/vpn_bridge_service.dart' show vpnBridgeServiceProvider;

/// Hardware-backed secure storage provider, adhering to ISecureStorageService.
final secureStorageServiceProvider = Provider<ISecureStorageService>((ref) {
  return SecureStorageService();
});

/// Cryptographic primitives provider (Ed25519 & X25519 key derivation and signatures).
final cryptoServiceProvider = Provider<CryptoService>((ref) {
  return CryptoService();
});

/// Zoop Cloud Control Plane API client provider, adhering to ICloudApiClient.
final cloudApiClientProvider = Provider<ICloudApiClient>((ref) {
  return CloudApiClient();
});
