import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../identity/application/identity_notifier.dart';
import '../domain/provider_settings.dart';

final providerNotifierProvider =
    StateNotifierProvider<ProviderNotifier, ProviderSettings>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  final notifier = ProviderNotifier(storageService: storage);
  notifier.loadSettings();
  return notifier;
});

class ProviderNotifier extends StateNotifier<ProviderSettings> {
  final SecureStorageService _storage;
  Timer? _metricsTimer;

  ProviderNotifier({required SecureStorageService storageService})
      : _storage = storageService,
        super(const ProviderSettings());

  /// Loads persisted provider preferences from secure hardware-backed storage.
  Future<void> loadSettings() async {
    final scopeStr = await _storage.getProviderSharingScope();
    final pauseCellular = await _storage.getProviderPauseOnCellular();
    final pauseBattery = await _storage.getProviderPauseOnLowBattery();
    final bandwidth = await _storage.getProviderBandwidthLimit();

    SharingScope scope = SharingScope.personalOnly;
    if (scopeStr == 'trustedCircle') {
      scope = SharingScope.trustedCircle;
    } else if (scopeStr == 'publicMesh') {
      scope = SharingScope.publicMesh;
    }

    state = state.copyWith(
      sharingScope: scope,
      pauseOnCellular: pauseCellular,
      pauseOnLowBattery: pauseBattery,
      bandwidthLimitMbps: bandwidth,
    );
  }

  /// Toggles gateway sharing mode (active egress provider).
  void toggleGateway(bool enable) {
    if (enable) {
      // Simulate/connect incoming client sessions when sharing starts
      final sessions = [
        RecipientSession(
          clientId: 'recip-01-berlin-mac',
          clientName: "Alex's MacBook Pro",
          clientVirtualIp: '100.64.0.14',
          connectedAt: DateTime.now().subtract(const Duration(minutes: 18)),
          bytesUploaded: 48 * 1024 * 1024,
          bytesDownloaded: 142 * 1024 * 1024,
          platform: 'macos',
        ),
        RecipientSession(
          clientId: 'recip-02-pixel-tablet',
          clientName: 'Zoop Tablet Node',
          clientVirtualIp: '100.64.0.22',
          connectedAt: DateTime.now().subtract(const Duration(minutes: 5)),
          bytesUploaded: 12 * 1024 * 1024,
          bytesDownloaded: 34 * 1024 * 1024,
          platform: 'android',
        ),
      ];

      state = state.copyWith(
        isGatewayActive: true,
        activeSessions: sessions,
        totalBytesShared: 236 * 1024 * 1024,
      );

      _startMetricsSimulation();
    } else {
      _metricsTimer?.cancel();
      _metricsTimer = null;
      state = state.copyWith(
        isGatewayActive: false,
        activeSessions: [],
      );
    }
  }

  /// Updates sharing boundary policy.
  Future<void> updateSharingScope(SharingScope scope) async {
    state = state.copyWith(sharingScope: scope);
    await _storage.setProviderSharingScope(scope.name);
  }

  /// Updates automated resource safeguards.
  Future<void> updateSafeguards({
    bool? pauseOnCellular,
    bool? pauseOnLowBattery,
    int? bandwidthLimitMbps,
  }) async {
    if (pauseOnCellular != null) {
      state = state.copyWith(pauseOnCellular: pauseOnCellular);
      await _storage.setProviderPauseOnCellular(pauseOnCellular);
    }
    if (pauseOnLowBattery != null) {
      state = state.copyWith(pauseOnLowBattery: pauseOnLowBattery);
      await _storage.setProviderPauseOnLowBattery(pauseOnLowBattery);
    }
    if (bandwidthLimitMbps != null) {
      state = state.copyWith(bandwidthLimitMbps: bandwidthLimitMbps);
      await _storage.setProviderBandwidthLimit(bandwidthLimitMbps);
    }
  }

  /// Terminates and kicks a specific recipient session.
  void disconnectRecipient(String clientId) {
    final updated = state.activeSessions
        .where((s) => s.clientId != clientId)
        .toList();
    state = state.copyWith(activeSessions: updated);
  }

  void _startMetricsSimulation() {
    _metricsTimer?.cancel();
    _metricsTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!state.isGatewayActive || state.activeSessions.isEmpty) return;

      final updated = state.activeSessions.map((session) {
        return session.copyWith(
          bytesUploaded: session.bytesUploaded + (250 * 1024),
          bytesDownloaded: session.bytesDownloaded + (780 * 1024),
        );
      }).toList();

      state = state.copyWith(
        activeSessions: updated,
        totalBytesShared: state.totalBytesShared + (1030 * 1024),
      );
    });
  }

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }
}
