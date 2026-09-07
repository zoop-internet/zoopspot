import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/crypto/crypto_service.dart';
import '../../../core/crypto/mnemonic_service.dart';
import '../../../core/network/cloud_api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../domain/identity_model.dart';

final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final cryptoServiceProvider = Provider<CryptoService>((ref) {
  return CryptoService();
});

final cloudApiClientProvider = Provider<CloudApiClient>((ref) {
  return CloudApiClient();
});

final identityNotifierProvider =
    StateNotifierProvider<IdentityNotifier, IdentityModel>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  final crypto = ref.watch(cryptoServiceProvider);
  final client = ref.watch(cloudApiClientProvider);
  final notifier = IdentityNotifier(
    storageService: storage,
    cryptoService: crypto,
    cloudApiClient: client,
  );
  notifier.loadPersistedIdentity();
  return notifier;
});

class IdentityNotifier extends StateNotifier<IdentityModel> {
  final SecureStorageService _storage;
  final CryptoService _crypto;
  final CloudApiClient _client;

  IdentityNotifier({
    required SecureStorageService storageService,
    required CryptoService cryptoService,
    required CloudApiClient cloudApiClient,
  })  : _storage = storageService,
        _crypto = cryptoService,
        _client = cloudApiClient,
        super(const IdentityModel());

  /// Loads locally stored identity from secure hardware keystore.
  Future<void> loadPersistedIdentity() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final hasIdentity = await _storage.hasIdentity();
      if (!hasIdentity) {
        state = state.copyWith(isLoading: false);
        return;
      }

      final zoopId = await _storage.getZoopId();
      final endpointId = await _storage.getEndpointId();
      final deviceName = await _storage.getDeviceName();
      final edPubKey = await _storage.getEd25519PublicKeyBase64();
      final wgPubKey = await _storage.getWireGuardPublicKeyBase64();
      final isReg = await _storage.isRegistered();
      final isBackedUp = await _storage.isBackedUp();
      final cloudUrl = await _storage.getCloudUrl();

      state = state.copyWith(
        zoopId: zoopId,
        endpointId: endpointId,
        deviceName: deviceName,
        ed25519PublicKeyB64: edPubKey,
        wireguardPublicKeyB64: wgPubKey,
        isRegistered: isReg,
        isBackedUp: isBackedUp,
        isLoading: false,
        cloudUrl: cloudUrl,
      );

      // Verify connection with cloud if registered
      if (isReg && endpointId != null) {
        verifyCloudConnection();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load identity: $e',
      );
    }
  }

  /// Generates a local cryptographic keypair and registers the device with the Cloud Control Plane.
  Future<bool> createAndRegister({
    required String deviceName,
    String? customCloudUrl,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      // 1. Generate local cryptographic keypair (Ed25519 + WireGuard X25519)
      final bundle = await _crypto.generateIdentityKeyPair();

      // 2. Register device with cloud control plane (zero-knowledge: only public keys)
      final client = customCloudUrl != null && customCloudUrl.isNotEmpty
          ? CloudApiClient(baseUrl: customCloudUrl, cryptoService: _crypto)
          : _client;

      final regResponse = await client.registerDevice(
        name: deviceName,
        ed25519PublicKeyB64: bundle.ed25519PublicKeyBase64,
        wireguardPublicKeyB64: bundle.wireGuardPublicKeyBase64,
        platform: 'android',
      );

      // 3. Persist keys and cloud registration in hardware-backed storage
      await _storage.saveIdentityBundle(
        bundle: bundle,
        deviceName: deviceName,
        endpointId: regResponse.endpointId,
        isRegistered: true,
      );

      if (customCloudUrl != null && customCloudUrl.isNotEmpty) {
        await _storage.setCloudUrl(customCloudUrl);
      }

      // 4. Update local reactive state
      state = state.copyWith(
        zoopId: bundle.zoopId,
        endpointId: regResponse.endpointId,
        deviceName: deviceName,
        ed25519PublicKeyB64: bundle.ed25519PublicKeyBase64,
        wireguardPublicKeyB64: bundle.wireGuardPublicKeyBase64,
        isRegistered: true,
        isLoading: false,
        cloudStatus: regResponse.status,
        cloudUrl: customCloudUrl ?? _client.baseUrl,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Registration failed: $e',
      );
      return false;
    }
  }

  /// Verifies active connection status with the Cloud Control Plane using signed Zoop-Auth.
  Future<void> verifyCloudConnection() async {
    final endpointId = state.endpointId;
    if (endpointId == null) return;

    try {
      final seed = await _storage.getEd25519SeedBytes();
      if (seed == null) return;

      final deviceData = await _client.getDevice(
        endpointId: endpointId,
        privateKeySeed: seed,
      );

      state = state.copyWith(
        cloudStatus: deviceData['status'] as String? ?? 'trusted',
      );
    } catch (_) {
      state = state.copyWith(cloudStatus: 'offline');
    }
  }

  /// Recovers an existing identity from 24 mnemonic words and registers with the cloud.
  Future<bool> recoverIdentity({
    required List<String> words,
    required String deviceName,
    String? customCloudUrl,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final seed = MnemonicService.mnemonicToEntropy(words);
      final bundle = await _crypto.restoreIdentityFromSeed(seed);

      final client = customCloudUrl != null && customCloudUrl.isNotEmpty
          ? CloudApiClient(baseUrl: customCloudUrl, cryptoService: _crypto)
          : _client;

      final regResponse = await client.registerDevice(
        name: deviceName,
        ed25519PublicKeyB64: bundle.ed25519PublicKeyBase64,
        wireguardPublicKeyB64: bundle.wireGuardPublicKeyBase64,
        platform: 'android',
      );

      await _storage.saveIdentityBundle(
        bundle: bundle,
        deviceName: deviceName,
        endpointId: regResponse.endpointId,
        isRegistered: true,
      );

      // Mnemonic phrase is already backed up since user entered it
      await _storage.setBackedUp(true);

      if (customCloudUrl != null && customCloudUrl.isNotEmpty) {
        await _storage.setCloudUrl(customCloudUrl);
      }

      state = state.copyWith(
        zoopId: bundle.zoopId,
        endpointId: regResponse.endpointId,
        deviceName: deviceName,
        ed25519PublicKeyB64: bundle.ed25519PublicKeyBase64,
        wireguardPublicKeyB64: bundle.wireGuardPublicKeyBase64,
        isRegistered: true,
        isBackedUp: true,
        isLoading: false,
        cloudStatus: regResponse.status,
        cloudUrl: customCloudUrl ?? _client.baseUrl,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Identity recovery failed: $e',
      );
      return false;
    }
  }

  /// Marks the current identity as backed up in persistent storage.
  Future<void> markAsBackedUp() async {
    await _storage.setBackedUp(true);
    state = state.copyWith(isBackedUp: true);
  }

  /// Retrieves the 24-word recovery mnemonic for the active identity.
  Future<List<String>?> getRecoveryMnemonic() async {
    final seed = await _storage.getEd25519SeedBytes();
    if (seed == null || seed.length != 32) return null;
    return MnemonicService.entropyToMnemonic(seed);
  }

  /// Resets the device identity and wipes secure storage.
  Future<void> resetIdentity() async {
    await _storage.clearAll();
    state = const IdentityModel();
  }
}
