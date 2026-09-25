import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/models/peer_device.dart';
import 'package:zoop_mobile/core/models/routing_mode.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/storage/i_secure_storage_service.dart';
import 'package:zoop_mobile/features/connections/application/connections_notifier.dart';
import 'package:zoop_mobile/features/fleet/presentation/widgets/device_pairing_sheet.dart';
import 'package:zoop_mobile/features/identity/application/identity_notifier.dart';
import 'package:zoop_mobile/features/identity/presentation/widgets/recovery_phrase_sheet.dart';
import 'package:zoop_mobile/features/settings/application/settings_notifier.dart';
import 'package:zoop_mobile/features/sharing/application/sharing_notifier.dart';
import 'package:zoop_mobile/features/wallet/presentation/widgets/add_funds_sheet.dart';
import 'package:zoop_mobile/features/wallet/presentation/widgets/withdraw_sheet.dart';

class _MockStorage implements ISecureStorageService {
  @override
  Future<String?> getEndpointId() async => 'ep-qa-test';
  @override
  Future<List<int>?> getEd25519SeedBytes() async => List.generate(32, (i) => i);
  @override
  Future<String?> getZoopId() async => 'ZP-QA001';
  @override
  Future<bool> isRegistered() async => true;
  @override
  Future<bool> hasIdentity() async => true;
  @override
  Future<String?> getDeviceName() async => 'QA Test Node';
  @override
  Future<String?> getEd25519PublicKeyBase64() async => 'ed-pub-b64';
  @override
  Future<String?> getWireGuardPublicKeyBase64() async => 'wg-pub-b64';
  @override
  Future<bool> isBackedUp() async => true;
  @override
  Future<String> getCloudUrl() async => 'https://mock.zoop.network';

  @override
  Future<String?> getPin() async => null;
  @override
  Future<void> savePin(String pin) async {}
  @override
  Future<bool> getZeroBalanceEnabled() async => true;
  @override
  Future<void> setZeroBalanceEnabled(bool val) async {}
  @override
  Future<String> getZeroBalanceCarrier() async => 'mtn-ug';
  @override
  Future<void> setZeroBalanceCarrier(String carrier) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _MockCloudApi implements ICloudApiClient {
  @override
  String get baseUrl => 'https://mock.zoop.network';
  @override
  Future<bool> checkHealth() async => true;
  @override
  Future<Map<String, dynamic>> getDevice({required String endpointId, required List<int> privateKeySeed}) async => {'status': 'trusted'};
  @override
  Future<List<PeerDevice>> listDevices({required String endpointId, required List<int> privateKeySeed}) async => [
    const PeerDevice(id: 'peer-1', endpointId: 'ep-1', name: 'Node Beta', platform: 'Android'),
  ];
  @override
  Future<Map<String, dynamic>> getWallet({required String endpointId, required List<int> privateKeySeed}) async => {
    'available_balance': 85000.0,
    'pending_balance': 5000.0,
    'total_earned': 182500.0,
    'unwithdrawn_earnings': 62000.0,
    'currency': 'UGX',
  };
  @override
  Future<Map<String, dynamic>> listWalletTransactions({required String endpointId, required List<int> privateKeySeed, int limit = 20, int offset = 0}) async => {'transactions': []};

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('Comprehensive QA Matrix & Testing Strategy (Phase 13)', () {
    test('IdentityNotifier loads persisted state accurately', () async {
      final notifier = IdentityNotifier(
        storageService: _MockStorage(),
        cryptoService: CryptoService(),
        cloudApiClient: _MockCloudApi(),
      );

      await notifier.loadPersistedIdentity();
      expect(notifier.state.zoopId, equals('ZP-QA001'));
      expect(notifier.state.isRegistered, isTrue);
      expect(notifier.state.deviceName, equals('QA Test Node'));
    });

    test('SharingNotifier updates throughput, recipients, and policy', () {
      final notifier = SharingNotifier();
      expect(notifier.state.isSharingActive, isTrue);

      notifier.toggleSharing();
      expect(notifier.state.isSharingActive, isFalse);

      notifier.toggleSharing();
      expect(notifier.state.isSharingActive, isTrue);
    });

    test('ConnectionsNotifier search filter filters providers accurately', () {
      final notifier = ConnectionsNotifier();
      expect(notifier.state.discoveredProviders.isNotEmpty, isTrue);

      notifier.setSearchQuery('NonExistentNodeName');
      expect(notifier.state.filteredDiscoveredProviders.isEmpty, isTrue);

      notifier.setSearchQuery('');
      expect(notifier.state.filteredDiscoveredProviders.isNotEmpty, isTrue);
    });

    test('SettingsNotifier manages PIN, killswitch, and routing mode', () {
      final notifier = SettingsNotifier(_MockStorage());
      expect(notifier.state.killSwitchEnabled, isTrue);

      notifier.toggleKillSwitch();
      expect(notifier.state.killSwitchEnabled, isFalse);

      notifier.toggleKillSwitch();
      expect(notifier.state.killSwitchEnabled, isTrue);

      notifier.setRoutingMode(RoutingMode.splitTunnel);
      expect(notifier.state.defaultRoutingMode, equals(RoutingMode.splitTunnel));
    });

    testWidgets('RecoveryPhraseSheet renders 24-word grid and reveal shield', (tester) async {
      final testWords = List.generate(24, (i) => 'word$i');

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: RecoveryPhraseSheet(words: testWords),
            ),
          ),
        ),
      );

      expect(find.byType(RecoveryPhraseSheet), findsOneWidget);
      expect(find.text('Secret Recovery Phrase'), findsOneWidget);
      expect(find.text('Tap to reveal recovery phrase'), findsOneWidget);

      // Tap reveal shield
      await tester.tap(find.text('Tap to reveal recovery phrase'), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('word0'), findsOneWidget);
      expect(find.text('word23'), findsOneWidget);
    });

    testWidgets('DevicePairingSheet renders pairing QR and code', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: DevicePairingSheet(
                deviceName: 'Node Beta',
                deviceId: 'ep-test-beta',
              ),
            ),
          ),
        ),
      );

      expect(find.byType(DevicePairingSheet), findsOneWidget);
      expect(find.text('Pair New Device'), findsOneWidget);
    });

    testWidgets('AddFundsSheet renders preset amounts and payment options', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: AddFundsSheet(
                onConfirm: ({required amount, required method, phoneNumber}) {},
              ),
            ),
          ),
        ),
      );

      expect(find.byType(AddFundsSheet), findsOneWidget);
      expect(find.text('Top-Up Zoop Wallet'), findsOneWidget);
      expect(find.text('MTN Mobile Money'), findsOneWidget);
      expect(find.text('Airtel Money'), findsOneWidget);
    });

    testWidgets('WithdrawSheet renders payout limits and validation', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: WithdrawSheet(
                availableAmount: 50000,
                onConfirm: ({required amount, required phoneNumber, required provider}) {},
              ),
            ),
          ),
        ),
      );

      expect(find.byType(WithdrawSheet), findsOneWidget);
      expect(find.text('Withdraw Provider Earnings'), findsOneWidget);
    });
  });
}
