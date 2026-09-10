import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/models/peer_device.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/network/signaling_client.dart';
import 'package:zoop_mobile/core/storage/i_secure_storage_service.dart';
import 'package:zoop_mobile/features/dashboard/application/peers_notifier.dart';
import 'package:zoop_mobile/features/wallet/application/wallet_notifier.dart';
import 'package:zoop_mobile/features/wallet/domain/wallet_models.dart';

class _MockStorage implements ISecureStorageService {
  String? zoopId = 'zp-test-node';
  String? endpointId = 'ep-test-node';
  List<int>? seedBytes = List.generate(32, (i) => i);
  bool registered = true;

  @override
  Future<String?> getEndpointId() async => endpointId;
  @override
  Future<List<int>?> getEd25519SeedBytes() async => seedBytes;
  @override
  Future<String?> getZoopId() async => zoopId;
  @override
  Future<bool> isRegistered() async => registered;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('Networking, API Resilience & Offline Sync (Phase 10)', () {
    group('SignalingClient Exponential Backoff & Jitter', () {
      test('computeBackoff calculates progressive delays within jitter bounds', () {
        final client = SignalingClient(
          initialDelay: const Duration(milliseconds: 1000),
          maxDelay: const Duration(seconds: 30),
          multiplier: 2.0,
          jitterFactor: 0.5,
        );

        // Attempt 0: 1000ms base. With jitterFactor 0.5, range is [500ms, 1000ms]
        final min0 = client.computeBackoff(0, 0.0);
        final max0 = client.computeBackoff(0, 1.0);
        expect(min0.inMilliseconds, equals(500));
        expect(max0.inMilliseconds, equals(1000));

        // Attempt 2: 1000 * 2^2 = 4000ms. Range [2000ms, 4000ms]
        final min2 = client.computeBackoff(2, 0.0);
        final max2 = client.computeBackoff(2, 1.0);
        expect(min2.inMilliseconds, equals(2000));
        expect(max2.inMilliseconds, equals(4000));

        // Attempt 10: would exceed 30s maxDelay, capped at 30,000ms. Range [15000ms, 30000ms]
        final min10 = client.computeBackoff(10, 0.0);
        final max10 = client.computeBackoff(10, 1.0);
        expect(min10.inMilliseconds, equals(15000));
        expect(max10.inMilliseconds, equals(30000));
      });

      test('reconnectAttempt counter resets on explicit disconnect', () {
        final client = SignalingClient();
        expect(client.reconnectAttempt, equals(0));
        client.disconnect();
        expect(client.reconnectAttempt, equals(0));
      });
    });

    group('CloudApiClient Timeout, Retries & Status Check', () {
      test('GET request retries with backoff on transient 503 gateway error', () async {
        int callCount = 0;
        final mockHttpClient = MockClient((request) async {
          callCount++;
          if (callCount < 3) {
            return http.Response(
              json.encode({'error': {'code': 'gateway_timeout', 'message': 'Gateway timeout'}}),
              503,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            json.encode({'status': 'ok'}),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final client = CloudApiClient(
          client: mockHttpClient,
          maxRetries: 3,
          requestTimeout: const Duration(seconds: 2),
        );

        final result = await client.authenticatedRequest(
          method: 'GET',
          path: '/v1/test',
          endpointId: 'ep-test',
          privateKeySeed: List.generate(32, (i) => i),
        );

        expect(callCount, equals(3));
        expect(result['status'], equals('ok'));
      });

      test('checkTransactionStatus queries dedicated status endpoint successfully', () async {
        final mockHttpClient = MockClient((request) async {
          if (request.url.path.contains('/status')) {
            return http.Response(
              json.encode({'status': 'completed', 'reference': 'REF-123'}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('Not Found', 404);
        });

        final client = CloudApiClient(client: mockHttpClient);
        final status = await client.checkTransactionStatus(
          endpointId: 'ep-test',
          privateKeySeed: List.generate(32, (i) => i),
          referenceId: 'REF-123',
        );

        expect(status['status'], equals('completed'));
        expect(status['reference'], equals('REF-123'));
      });
    });

    group('WalletNotifier USSD Polling & Offline Resilience', () {
      test('pollTransactionStatus confirms completed status and updates transaction item', () async {
        final mockStorage = _MockStorage();
        final mockHttpClient = MockClient((request) async {
          if (request.url.path.contains('/status')) {
            return http.Response(
              json.encode({'status': 'completed', 'reference': 'REF-POLL-1'}),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          if (request.url.path.contains('/wallet')) {
            return http.Response(
              json.encode({
                'available_balance': 95000.0,
                'pending_balance': 0.0,
                'total_earned': 182500.0,
                'unwithdrawn_earnings': 62000.0,
                'currency': 'UGX',
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response('{}', 200);
        });

        final client = CloudApiClient(client: mockHttpClient);
        final notifier = WalletNotifier(
          cloudApiClient: client,
          storageService: mockStorage,
        );

        // Prepopulate with a pending transaction
        final initialTx = WalletTransactionItem(
          id: 'tx-poll-1',
          type: TransactionType.deposit,
          amount: 10000,
          description: 'Top-up via MTN Mobile Money',
          timestamp: DateTime.now(),
          status: TransactionStatus.pending,
          referenceId: 'REF-POLL-1',
        );

        notifier.state = notifier.state.copyWith(
          transactions: [initialTx],
        );

        final result = await notifier.pollTransactionStatus(
          'REF-POLL-1',
          timeoutSeconds: 5,
          initialInterval: const Duration(milliseconds: 100),
        );

        expect(result, equals('completed'));
        final updatedTx = notifier.state.transactions.firstWhere((t) => t.referenceId == 'REF-POLL-1');
        expect(updatedTx.status, equals(TransactionStatus.completed));
        expect(notifier.state.availableBalance, equals(95000.0));
      });

      test('refreshBalance marks isOffline on network exception while preserving local balance', () async {
        final mockStorage = _MockStorage();
        final mockHttpClient = MockClient((request) async {
          throw http.ClientException('Network unreachable');
        });

        final client = CloudApiClient(client: mockHttpClient);
        final notifier = WalletNotifier(
          cloudApiClient: client,
          storageService: mockStorage,
        );

        notifier.state = notifier.state.copyWith(
          availableBalance: 85000.0,
          isOffline: false,
        );

        await notifier.refreshBalance();

        expect(notifier.state.isOffline, isTrue);
        expect(notifier.state.availableBalance, equals(85000.0));
      });
    });

    group('PeersNotifier Offline Mesh Resilience', () {
      test('loadPeers preserves cached mesh peers on network outage and marks isOffline', () async {
        final mockStorage = _MockStorage();
        final mockHttpClient = MockClient((request) async {
          throw http.ClientException('Connection reset by peer');
        });

        final client = CloudApiClient(client: mockHttpClient);
        final notifier = PeersNotifier(
          cloudApiClient: client,
          storageService: mockStorage,
        );

        const cachedPeer = PeerDevice(
          id: 'node-cached-1',
          endpointId: 'ep-cached-1',
          name: 'Kampala Core Mesh',
          platform: 'android',
        );

        notifier.state = notifier.state.copyWith(
          peers: const [cachedPeer],
          selectedPeer: cachedPeer,
          isOffline: false,
        );

        await notifier.loadPeers();

        expect(notifier.state.isOffline, isTrue);
        expect(notifier.state.peers.length, equals(1));
        expect(notifier.state.peers.first.id, equals('node-cached-1'));
        expect(notifier.state.selectedPeer?.id, equals('node-cached-1'));
      });
    });
  });
}
