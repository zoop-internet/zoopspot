import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/cloud_api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../identity/application/identity_notifier.dart';

class PairingState {
  final String? activeCode;
  final DateTime? expiresAt;
  final bool isGenerating;
  final bool isClaiming;
  final bool isLoadingFleet;
  final String? errorMessage;
  final String? successMessage;
  final List<Map<String, dynamic>> fleetDevices;

  const PairingState({
    this.activeCode,
    this.expiresAt,
    this.isGenerating = false,
    this.isClaiming = false,
    this.isLoadingFleet = false,
    this.errorMessage,
    this.successMessage,
    this.fleetDevices = const [],
  });

  bool get isExpired =>
      expiresAt != null && DateTime.now().isAfter(expiresAt!);

  PairingState copyWith({
    String? activeCode,
    DateTime? expiresAt,
    bool? isGenerating,
    bool? isClaiming,
    bool? isLoadingFleet,
    String? errorMessage,
    String? successMessage,
    List<Map<String, dynamic>>? fleetDevices,
    bool clearActiveCode = false,
    bool clearErrorMessage = false,
    bool clearSuccessMessage = false,
  }) {
    return PairingState(
      activeCode: clearActiveCode ? null : (activeCode ?? this.activeCode),
      expiresAt: clearActiveCode ? null : (expiresAt ?? this.expiresAt),
      isGenerating: isGenerating ?? this.isGenerating,
      isClaiming: isClaiming ?? this.isClaiming,
      isLoadingFleet: isLoadingFleet ?? this.isLoadingFleet,
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccessMessage ? null : (successMessage ?? this.successMessage),
      fleetDevices: fleetDevices ?? this.fleetDevices,
    );
  }
}

final pairingNotifierProvider =
    StateNotifierProvider<PairingNotifier, PairingState>((ref) {
  final client = ref.watch(cloudApiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  final notifier = PairingNotifier(
    cloudApiClient: client,
    storageService: storage,
  );
  notifier.loadFleet();
  return notifier;
});

class PairingNotifier extends StateNotifier<PairingState> {
  final CloudApiClient _client;
  final SecureStorageService _storage;

  PairingNotifier({
    required CloudApiClient cloudApiClient,
    required SecureStorageService storageService,
  })  : _client = cloudApiClient,
        _storage = storageService,
        super(const PairingState());

  /// Generates an ephemeral pairing token (valid for 10 minutes) for another device to scan/enter.
  Future<void> generateToken() async {
    state = state.copyWith(isGenerating: true, errorMessage: null);

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();
      if (endpointId == null || seed == null) {
        state = state.copyWith(
          isGenerating: false,
          errorMessage: 'Device identity not initialized',
        );
        return;
      }

      final resp = await _client.createPairingToken(
        endpointId: endpointId,
        privateKeySeed: seed,
      );

      final code = resp['code'] as String?;
      final expiresStr = resp['expires_at'] as String?;
      final expiresAt = expiresStr != null
          ? DateTime.tryParse(expiresStr) ?? DateTime.now().add(const Duration(minutes: 10))
          : DateTime.now().add(const Duration(minutes: 10));

      state = state.copyWith(
        activeCode: code,
        expiresAt: expiresAt,
        isGenerating: false,
      );
    } catch (e) {
      state = state.copyWith(
        isGenerating: false,
        errorMessage: 'Failed to create pairing token: $e',
      );
    }
  }

  /// Claims an ephemeral pairing code to link with another device in the mesh.
  Future<bool> claimToken(String code) async {
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.isEmpty) {
      state = state.copyWith(errorMessage: 'Please enter a valid pairing code');
      return false;
    }

    state = state.copyWith(
      isClaiming: true,
      clearErrorMessage: true,
      clearSuccessMessage: true,
    );

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();
      if (endpointId == null || seed == null) {
        state = state.copyWith(
          isClaiming: false,
          errorMessage: 'Device identity not initialized',
        );
        return false;
      }

      final resp = await _client.claimPairingToken(
        endpointId: endpointId,
        code: cleanCode,
        privateKeySeed: seed,
      );

      final pairedName = resp['paired_device_name'] as String? ?? 'Device';
      state = state.copyWith(
        isClaiming: false,
        successMessage: 'Successfully paired with $pairedName!',
      );

      // Refresh fleet
      await loadFleet();
      return true;
    } catch (e) {
      state = state.copyWith(
        isClaiming: false,
        errorMessage: 'Pairing failed: $e',
      );
      return false;
    }
  }

  /// Loads all devices paired in the personal mesh fleet.
  Future<void> loadFleet() async {
    state = state.copyWith(isLoadingFleet: true);

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();
      if (endpointId == null || seed == null) {
        state = state.copyWith(isLoadingFleet: false);
        return;
      }

      final fleet = await _client.getFleetDevices(
        endpointId: endpointId,
        privateKeySeed: seed,
      );

      state = state.copyWith(
        fleetDevices: fleet,
        isLoadingFleet: false,
      );
    } catch (_) {
      state = state.copyWith(isLoadingFleet: false);
    }
  }

  void clearMessages() {
    state = state.copyWith(clearErrorMessage: true, clearSuccessMessage: true);
  }
}
