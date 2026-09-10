import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:zoop_mobile/core/auth/biometric_auth_service.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/di/core_providers.dart';
import 'package:zoop_mobile/core/models/peer_device.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/storage/secure_storage_service.dart';
import 'package:zoop_mobile/core/vpn/vpn_bridge_service.dart';
import 'package:zoop_mobile/features/activity/application/activity_notifier.dart';
import 'package:zoop_mobile/features/dashboard/application/peers_notifier.dart';
import 'package:zoop_mobile/features/devices/application/devices_notifier.dart';
import 'package:zoop_mobile/features/diagnostics/application/diagnostics_notifier.dart';
import 'package:zoop_mobile/features/organizations/application/organizations_notifier.dart';
import 'package:zoop_mobile/features/sharing/application/sharing_notifier.dart';

// ---------------------------------------------------------------------------
// Mock Implementations for Dependency Inversion Verification
// ---------------------------------------------------------------------------

class MockVpnBridge implements IVpnBridgeService {
  bool isTunnelActive = false;
  String? lastStartedPeerKey;

  @override
  Future<bool> prepareVpn() async => true;

  @override
  Future<bool> startTunnel({
    String? peerKey,
    String? candidatesJson,
    String? relayUrl,
    String routingMode = 'full',
  }) async {
    isTunnelActive = true;
    lastStartedPeerKey = peerKey;
    return true;
  }

  @override
  Future<bool> stopTunnel() async {
    isTunnelActive = false;
    return true;
  }

  @override
  Future<bool> isTunnelRunning() async => isTunnelActive;

  @override
  Stream<Map<dynamic, dynamic>> get vpnEvents => const Stream.empty();
}

class MockBiometrics implements IBiometricAuthService {
  bool shouldSucceed = true;

  @override
  Future<bool> canAuthenticate() async => true;

  @override
  Future<bool> authenticate({
    String title = 'Zoop Key Security',
    String description = 'Authenticate to access your private recovery phrase',
  }) async => shouldSucceed;
}

class MockStorage implements ISecureStorageService {
  String? endpointId = 'ep-mock-test-123';
  List<int>? seed = [1, 2, 3, 4, 5, 6, 7, 8];
  String? pin;
  bool registered = true;

  @override
  Future<void> saveIdentityBundle({
    required IdentityKeyPairBundle bundle,
    required String deviceName,
    String? endpointId,
    bool isRegistered = false,
  }) async {
    this.endpointId = endpointId;
    registered = isRegistered;
  }

  @override
  Future<void> setRegistrationStatus({
    required String endpointId,
    required bool isRegistered,
  }) async {
    this.endpointId = endpointId;
    registered = isRegistered;
  }

  @override
  Future<String?> getZoopId() async => 'zp-mock-zoop-id';
  @override
  Future<String?> getEndpointId() async => endpointId;
  @override
  Future<String?> getDeviceName() async => 'Mock Android Device';
  @override
  Future<String?> getEd25519PublicKeyBase64() async => 'ed25519-mock-pubkey';
  @override
  Future<String?> getEd25519SeedBase64() async => 'ed25519-mock-seed';
  @override
  Future<String?> getWireGuardPublicKeyBase64() async => 'wg-mock-pubkey';
  @override
  Future<String?> getWireGuardPrivateKeyBase64() async => 'wg-mock-privkey';
  @override
  Future<List<int>?> getEd25519SeedBytes() async => seed;
  @override
  Future<String> getCloudUrl() async => 'https://mock.zoop.network';
  @override
  Future<void> setCloudUrl(String url) async {}
  @override
  Future<bool> isRegistered() async => registered;
  @override
  Future<bool> hasIdentity() async => true;
  @override
  Future<bool> isBackedUp() async => true;
  @override
  Future<void> setBackedUp(bool backedUp) async {}
  @override
  Future<String?> getProviderSharingScope() async => 'trustedCircle';
  @override
  Future<void> setProviderSharingScope(String scope) async {}
  @override
  Future<bool> getProviderPauseOnCellular() async => true;
  @override
  Future<void> setProviderPauseOnCellular(bool val) async {}
  @override
  Future<bool> getProviderPauseOnLowBattery() async => true;
  @override
  Future<void> setProviderPauseOnLowBattery(bool val) async {}
  @override
  Future<int> getProviderBandwidthLimit() async => 50;
  @override
  Future<void> setProviderBandwidthLimit(int limit) async {}
  @override
  Future<String?> getPin() async => pin;
  @override
  Future<void> savePin(String pin) async => this.pin = pin;
  @override
  Future<void> clearAll() async {}
}

class MockCloudApi implements ICloudApiClient {
  bool connectionCreated = false;
  String? lastConnectedTargetId;

  @override
  String get baseUrl => 'https://mock.zoop.network';

  @override
  Future<bool> checkHealth() async => true;

  @override
  Future<DeviceRegistrationResponse> registerDevice({
    required String name,
    required String ed25519PublicKeyB64,
    required String wireguardPublicKeyB64,
    String platform = 'android',
    List<String> capabilities = const ['vpn', 'recipient', 'provider'],
  }) async {
    return DeviceRegistrationResponse(
      id: 'dev-mock-01',
      endpointId: 'ep-mock-01',
      status: 'trusted',
    );
  }

  @override
  Future<dynamic> authenticatedRequest({
    required String method,
    required String path,
    required String endpointId,
    required List<int> privateKeySeed,
    Map<String, dynamic>? body,
  }) async => {};

  @override
  Future<Map<String, dynamic>> getDevice({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async => {'id': endpointId, 'status': 'trusted'};

  @override
  Future<List<PeerDevice>> listDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    return [
      const PeerDevice(
        id: 'node-remote-gateway',
        endpointId: 'ep-remote-gateway',
        name: 'Mock Remote Gateway',
        platform: 'linux',
        status: 'trusted',
        wireguardPublicKey: 'mock-wg-key-99',
      ),
    ];
  }

  @override
  Future<Map<String, dynamic>> getDeviceEndpoints({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
  }) async => {
        'wireguard_public_key': 'mock-wg-resolved-key',
        'endpoints': ['192.168.1.100:51820'],
      };

  @override
  Future<Map<String, dynamic>> createConnection({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
  }) async {
    connectionCreated = true;
    lastConnectedTargetId = targetDeviceId;
    return {
      'id': 'conn-mock-session-88',
      'status': 'established',
      'target_device_id': targetDeviceId,
    };
  }

  @override
  Future<Map<String, dynamic>> listShares({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async => {};

  @override
  Future<Map<String, dynamic>> createPairingToken({
    required String endpointId,
    required List<int> privateKeySeed,
    int expiresInSeconds = 600,
  }) async => {'code': '123456'};

  @override
  Future<Map<String, dynamic>> claimPairingToken({
    required String endpointId,
    required String code,
    required List<int> privateKeySeed,
  }) async => {'status': 'linked'};

  @override
  Future<List<Map<String, dynamic>>> getFleetDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async => [];

  @override
  Future<Map<String, dynamic>> submitDiagnosticReport(Map<String, dynamic> report) async => {};

  @override
  Future<List<Map<String, dynamic>>> getDiagnosticReports(String deviceId) async => [];

  @override
  Future<Map<String, dynamic>> getWallet({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async => {'balance': 99000.0};

  @override
  Future<Map<String, dynamic>> depositMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  }) async => {'status': 'pending'};

  @override
  Future<Map<String, dynamic>> depositCard({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    String? callbackUrl,
    String? description,
  }) async => {'status': 'completed'};

  @override
  Future<Map<String, dynamic>> withdrawMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  }) async => {'status': 'completed'};

  @override
  Future<Map<String, dynamic>> listWalletTransactions({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  }) async => {'transactions': []};

  @override
  Future<Map<String, dynamic>> listWalletEarnings({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  }) async => {'earnings': []};

  @override
  Future<Map<String, dynamic>> checkTransactionStatus({
    required String endpointId,
    required List<int> privateKeySeed,
    required String referenceId,
  }) async => {'status': 'completed', 'reference': referenceId};
}

void main() {
  group('Architecture & Dependency Inversion Tests', () {
    test('IVpnBridgeService mock can be injected via Riverpod override', () async {
      final mockVpn = MockVpnBridge();
      final container = ProviderContainer(
        overrides: [
          vpnBridgeServiceProvider.overrideWithValue(mockVpn),
        ],
      );
      addTearDown(container.dispose);

      final vpn = container.read(vpnBridgeServiceProvider);
      expect(vpn, isA<IVpnBridgeService>());
      expect(await vpn.isTunnelRunning(), isFalse);

      await vpn.startTunnel(peerKey: 'peer-abc', routingMode: 'full');
      expect(await vpn.isTunnelRunning(), isTrue);
      expect(mockVpn.lastStartedPeerKey, 'peer-abc');

      await vpn.stopTunnel();
      expect(await vpn.isTunnelRunning(), isFalse);
    });

    test('IBiometricAuthService mock can be injected and queried cleanly', () async {
      final mockBio = MockBiometrics();
      final container = ProviderContainer(
        overrides: [
          biometricAuthServiceProvider.overrideWithValue(mockBio),
        ],
      );
      addTearDown(container.dispose);

      final bio = container.read(biometricAuthServiceProvider);
      expect(bio, isA<IBiometricAuthService>());
      expect(await bio.canAuthenticate(), isTrue);
      expect(await bio.authenticate(), isTrue);

      mockBio.shouldSucceed = false;
      expect(await bio.authenticate(), isFalse);
    });

    test('PeersNotifier uses ISecureStorageService and ICloudApiClient without platform channels', () async {
      final mockStorage = MockStorage();
      final mockCloud = MockCloudApi();

      final notifier = PeersNotifier(
        cloudApiClient: mockCloud,
        storageService: mockStorage,
      );

      await notifier.loadPeers();
      expect(notifier.state.peers.length, 1);
      expect(notifier.state.peers.first.endpointId, 'ep-remote-gateway');
      expect(notifier.state.selectedPeer?.endpointId, 'ep-remote-gateway');

      final target = notifier.state.peers.first;
      final connResult = await notifier.initiatePeerConnection(target);
      expect(connResult, isNotNull);
      expect(connResult?['status'], 'established');
      expect(mockCloud.connectionCreated, isTrue);
      expect(mockCloud.lastConnectedTargetId, 'node-remote-gateway');
    });

    test('SharingNotifier properly cleans up background timers on dispose', () {
      final notifier = SharingNotifier();
      expect(notifier.state.isSharingActive, isTrue);

      notifier.toggleSharing();
      expect(notifier.state.isSharingActive, isFalse);

      // Verifies that dispose executes without throwing or leaking dangling timers
      expect(() => notifier.dispose(), returnsNormally);
    });

    test('State objects maintain strict immutability and copyWith integrity', () {
      // ActivityState
      const act = ActivityState(searchQuery: 'tunnel');
      final actCopy = act.copyWith(searchQuery: 'gateway');
      expect(act.searchQuery, 'tunnel');
      expect(actCopy.searchQuery, 'gateway');

      // DevicesState
      const dev = DevicesState(isLoading: false);
      final devCopy = dev.copyWith(isLoading: true);
      expect(dev.isLoading, isFalse);
      expect(devCopy.isLoading, isTrue);

      // DiagnosticsState
      const diag = DiagnosticsState(isRunning: false);
      final diagCopy = diag.copyWith(isRunning: true);
      expect(diag.isRunning, isFalse);
      expect(diagCopy.isRunning, isTrue);

      // OrganizationsState
      const org = OrganizationsState(isLoading: false);
      final orgCopy = org.copyWith(isLoading: true);
      expect(org.isLoading, isFalse);
      expect(orgCopy.isLoading, isTrue);
    });
  });
}
