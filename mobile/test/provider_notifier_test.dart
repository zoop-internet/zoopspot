import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/features/provider/application/provider_notifier.dart';
import 'package:zoop_mobile/features/provider/domain/provider_settings.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  group('ProviderNotifier Tests', () {
    late SecureStorageService storageService;

    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
      storageService = SecureStorageService();
    });

    test('initial state has default provider settings', () {
      final notifier = ProviderNotifier(storageService: storageService);
      expect(notifier.state.isGatewayActive, isFalse);
      expect(notifier.state.sharingScope, SharingScope.personalOnly);
      expect(notifier.state.pauseOnCellular, isTrue);
      expect(notifier.state.pauseOnLowBattery, isTrue);
      expect(notifier.state.bandwidthLimitMbps, 50);
      expect(notifier.state.activeSessions, isEmpty);
    });

    test('loadSettings reads persisted preferences', () async {
      await storageService.setProviderSharingScope('trustedCircle');
      await storageService.setProviderPauseOnCellular(false);
      await storageService.setProviderPauseOnLowBattery(true);
      await storageService.setProviderBandwidthLimit(100);

      final notifier = ProviderNotifier(storageService: storageService);
      await notifier.loadSettings();

      expect(notifier.state.sharingScope, SharingScope.trustedCircle);
      expect(notifier.state.pauseOnCellular, isFalse);
      expect(notifier.state.pauseOnLowBattery, isTrue);
      expect(notifier.state.bandwidthLimitMbps, 100);
    });

    test('toggleGateway activates and deactivates gateway sessions', () {
      final notifier = ProviderNotifier(storageService: storageService);

      // Turn on
      notifier.toggleGateway(true);
      expect(notifier.state.isGatewayActive, isTrue);
      expect(notifier.state.activeSessions.isNotEmpty, isTrue);
      expect(notifier.state.totalBytesShared, greaterThan(0));

      // Turn off
      notifier.toggleGateway(false);
      expect(notifier.state.isGatewayActive, isFalse);
      expect(notifier.state.activeSessions, isEmpty);
    });

    test('updateSharingScope updates state and persists', () async {
      final notifier = ProviderNotifier(storageService: storageService);

      await notifier.updateSharingScope(SharingScope.publicMesh);
      expect(notifier.state.sharingScope, SharingScope.publicMesh);

      final stored = await storageService.getProviderSharingScope();
      expect(stored, 'publicMesh');
    });

    test('updateSafeguards modifies parameters and persists', () async {
      final notifier = ProviderNotifier(storageService: storageService);

      await notifier.updateSafeguards(
        pauseOnCellular: false,
        pauseOnLowBattery: false,
        bandwidthLimitMbps: 25,
      );

      expect(notifier.state.pauseOnCellular, isFalse);
      expect(notifier.state.pauseOnLowBattery, isFalse);
      expect(notifier.state.bandwidthLimitMbps, 25);

      expect(await storageService.getProviderPauseOnCellular(), isFalse);
      expect(await storageService.getProviderPauseOnLowBattery(), isFalse);
      expect(await storageService.getProviderBandwidthLimit(), 25);
    });

    test('disconnectRecipient removes targeted recipient session', () {
      final notifier = ProviderNotifier(storageService: storageService);
      notifier.toggleGateway(true);

      expect(notifier.state.activeSessions.length, 2);
      final firstClient = notifier.state.activeSessions.first;

      notifier.disconnectRecipient(firstClient.clientId);
      expect(notifier.state.activeSessions.length, 1);
      expect(
        notifier.state.activeSessions.any((s) => s.clientId == firstClient.clientId),
        isFalse,
      );
    });
  });
}
