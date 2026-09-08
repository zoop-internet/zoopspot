import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/routing_mode.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../identity/application/identity_notifier.dart';
import '../domain/settings_models.dart';

class SettingsNotifier extends StateNotifier<AppSettings> {
  final SecureStorageService _storage;

  SettingsNotifier(this._storage) : super(const AppSettings()) {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final pin = await _storage.getPin();
    state = state.copyWith(hasPinSet: pin != null && pin.isNotEmpty);
  }

  void toggleKillSwitch() {
    state = state.copyWith(killSwitchEnabled: !state.killSwitchEnabled);
  }

  void toggleBiometrics() {
    state = state.copyWith(biometricsEnabled: !state.biometricsEnabled);
  }

  void toggleTelemetry() {
    state = state.copyWith(telemetryEnabled: !state.telemetryEnabled);
  }

  void toggleNotification(String key) {
    if (key == 'connection') {
      state = state.copyWith(notifyOnConnection: !state.notifyOnConnection);
    } else if (key == 'peerRequest') {
      state = state.copyWith(notifyOnPeerRequest: !state.notifyOnPeerRequest);
    } else if (key == 'securityAlert') {
      state = state.copyWith(notifyOnSecurityAlert: !state.notifyOnSecurityAlert);
    }
  }

  Future<void> setPin(String newPin) async {
    await _storage.savePin(newPin);
    state = state.copyWith(hasPinSet: true);
  }

  void setMtu(int mtu) {
    state = state.copyWith(mtuClamping: mtu);
  }

  void setRoutingMode(RoutingMode mode) {
    state = state.copyWith(defaultRoutingMode: mode);
  }
}

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  final storage = ref.watch(secureStorageServiceProvider);
  return SettingsNotifier(storage);
});
