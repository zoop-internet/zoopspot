import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:zoop_mobile/core/models/routing_mode.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/features/settings/application/settings_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('SettingsNotifier Tests', () {
    late SecureStorageService storage;
    late SettingsNotifier notifier;

    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
      storage = SecureStorageService();
      notifier = SettingsNotifier(storage);
    });

    test('Initial settings state has expected defaults', () {
      final state = notifier.state;
      expect(state.defaultRoutingMode, equals(RoutingMode.fullInternet));
      expect(state.mtuClamping, equals(1420));
      expect(state.killSwitchEnabled, isTrue);
      expect(state.biometricsEnabled, isTrue);
      expect(state.telemetryEnabled, isFalse);
    });

    test('Toggles killswitch, biometrics, and telemetry', () {
      notifier.toggleKillSwitch();
      expect(notifier.state.killSwitchEnabled, isFalse);

      notifier.toggleBiometrics();
      expect(notifier.state.biometricsEnabled, isFalse);

      notifier.toggleTelemetry();
      expect(notifier.state.telemetryEnabled, isTrue);
    });

    test('Toggles notification settings', () {
      notifier.toggleNotification('connection');
      expect(notifier.state.notifyOnConnection, isFalse);

      notifier.toggleNotification('peerRequest');
      expect(notifier.state.notifyOnPeerRequest, isFalse);
    });

    test('Setting PIN updates storage and state', () async {
      await notifier.setPin('1234');

      expect(notifier.state.hasPinSet, isTrue);
      final storedPin = await storage.getPin();
      expect(storedPin, equals('1234'));
    });

    test('Changing MTU and default routing mode updates state', () {
      notifier.setMtu(1360);
      expect(notifier.state.mtuClamping, equals(1360));

      notifier.setRoutingMode(RoutingMode.splitTunnel);
      expect(notifier.state.defaultRoutingMode, equals(RoutingMode.splitTunnel));
    });
  });
}
