import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/network/cloud_api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/utils/phone_utils.dart';
import '../domain/wallet_models.dart';

class WalletState {
  final double availableBalance;
  final double pendingBalance;
  final double totalEarnedSharing;
  final double unwithdrawnEarnings;
  final double totalDataServedGb;
  final String currency;
  final List<WalletTransactionItem> transactions;
  final bool isLoading;
  final String? errorMessage;
  final bool isOffline;

  const WalletState({
    this.availableBalance = 85000.0,
    this.pendingBalance = 5000.0,
    this.totalEarnedSharing = 182500.0,
    this.unwithdrawnEarnings = 62000.0,
    this.totalDataServedGb = 248.5,
    this.currency = 'UGX',
    this.transactions = const [],
    this.isLoading = false,
    this.errorMessage,
    this.isOffline = false,
  });

  // Backward compatibility getters
  double get availableBalanceUsd => availableBalance;
  double get pendingBalanceUsd => pendingBalance;
  double get totalEarnedSharingUsd => totalEarnedSharing;
  double get unwithdrawnEarningsUsd => unwithdrawnEarnings;

  String formatAmount(double value) {
    final formattedNum = value.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
    return '$currency $formattedNum';
  }

  WalletState copyWith({
    double? availableBalance,
    double? pendingBalance,
    double? totalEarnedSharing,
    double? unwithdrawnEarnings,
    double? totalDataServedGb,
    String? currency,
    List<WalletTransactionItem>? transactions,
    bool? isLoading,
    String? errorMessage,
    bool clearErrorMessage = false,
    bool? isOffline,
  }) {
    return WalletState(
      availableBalance: availableBalance ?? this.availableBalance,
      pendingBalance: pendingBalance ?? this.pendingBalance,
      totalEarnedSharing: totalEarnedSharing ?? this.totalEarnedSharing,
      unwithdrawnEarnings: unwithdrawnEarnings ?? this.unwithdrawnEarnings,
      totalDataServedGb: totalDataServedGb ?? this.totalDataServedGb,
      currency: currency ?? this.currency,
      transactions: transactions ?? this.transactions,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
      isOffline: isOffline ?? this.isOffline,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  final ICloudApiClient? _client;
  final ISecureStorageService? _storage;

  WalletNotifier({
    ICloudApiClient? cloudApiClient,
    ISecureStorageService? storageService,
  })  : _client = cloudApiClient,
        _storage = storageService,
        super(const WalletState()) {
    _loadInitialTransactions();
  }

  void _loadInitialTransactions() {
    final now = DateTime.now();
    final list = [
      WalletTransactionItem(
        id: 'tx-01',
        type: TransactionType.sharingEarning,
        amount: 12500,
        description: 'Egress traffic relay reward (42.5 GB relayed)',
        timestamp: now.subtract(const Duration(hours: 4)),
        status: TransactionStatus.completed,
        referenceId: 'REF-REWARD-8821',
        paymentMethod: PaymentMethodType.meshInternal,
      ),
      WalletTransactionItem(
        id: 'tx-02',
        type: TransactionType.bandwidthSpend,
        amount: 3200,
        description: 'P2P WireGuard Tunnel to Zurich Node',
        timestamp: now.subtract(const Duration(hours: 18)),
        status: TransactionStatus.completed,
        referenceId: 'REF-CONSUME-4410',
        paymentMethod: PaymentMethodType.meshInternal,
      ),
      WalletTransactionItem(
        id: 'tx-03',
        type: TransactionType.deposit,
        amount: 50000,
        description: 'Top-up via MTN Mobile Money (+256 77***421)',
        timestamp: now.subtract(const Duration(days: 1)),
        status: TransactionStatus.completed,
        referenceId: 'c97fae8b-9b7f-4192-9f72-6f0859d33e67',
        paymentMethod: PaymentMethodType.mtnMobileMoney,
        phoneNumber: '+256772123421',
        providerReference: '148769164724',
      ),
      WalletTransactionItem(
        id: 'tx-04',
        type: TransactionType.deposit,
        amount: 25000,
        description: 'Top-up via Debit / Credit Card (Visa)',
        timestamp: now.subtract(const Duration(days: 3)),
        status: TransactionStatus.completed,
        referenceId: 'b59d3d6d-5827-41ee-b455-18dd20ef1c8a',
        paymentMethod: PaymentMethodType.card,
        providerReference: 'MP-CARD-99142',
      ),
      WalletTransactionItem(
        id: 'tx-05',
        type: TransactionType.withdrawal,
        amount: 35000,
        description: 'Earnings payout to Airtel Money (+256 70***853)',
        timestamp: now.subtract(const Duration(days: 5)),
        status: TransactionStatus.completed,
        referenceId: 'payout-2026-07-31-001',
        paymentMethod: PaymentMethodType.airtelMoney,
        phoneNumber: '+256701983853',
        providerReference: 'AIRTEL_MONEY_9921',
      ),
    ];

    state = state.copyWith(transactions: list);
  }

  /// Deposit funds via Mobile Money (MTN or Airtel) via the cloud server
  Future<PaymentInitiationResult> addFundsViaMobileMoney({
    required double amount,
    required String phoneNumber,
    String? provider,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final detected = PhoneUtils.detectUgandaNetwork(phoneNumber);
      final netProvider = provider ?? (detected == 'airtel' ? 'airtel' : 'mtn');
      final isMtn = netProvider.toLowerCase().contains('mtn');

      PaymentInitiationResult result;
      final endpointId = await _storage?.getEndpointId();
      final seed = await _storage?.getEd25519SeedBytes();

      if (_client != null && endpointId != null && seed != null) {
        final res = await _client.depositMobileMoney(
          endpointId: endpointId,
          privateKeySeed: seed,
          amount: amount,
          phoneNumber: phoneNumber,
          provider: netProvider,
          description: 'Zoop Top-up',
        );
        result = PaymentInitiationResult.fromJson(res);
      } else {
        // Simulated local fallback
        result = PaymentInitiationResult(
          reference: 'MM-${DateTime.now().millisecondsSinceEpoch}',
          status: 'pending',
          provider: isMtn ? 'MTN' : 'Airtel',
          providerReference: 'SIM-${DateTime.now().millisecondsSinceEpoch}',
        );
      }

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.deposit,
        amount: amount,
        description: 'Top-up via ${isMtn ? "MTN Mobile Money" : "Airtel Money"} ($phoneNumber)',
        timestamp: DateTime.now(),
        status: TransactionStatus.pending,
        referenceId: result.reference,
        paymentMethod: isMtn ? PaymentMethodType.mtnMobileMoney : PaymentMethodType.airtelMoney,
        phoneNumber: phoneNumber,
        providerReference: result.providerReference,
      );

      state = state.copyWith(
        availableBalance: state.availableBalance + amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      // Trigger background status polling for telecom USSD approval
      pollTransactionStatus(result.reference);

      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Deposit funds via Card via the cloud server
  Future<PaymentInitiationResult> addFundsViaCard({
    required double amount,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      PaymentInitiationResult result;
      final endpointId = await _storage?.getEndpointId();
      final seed = await _storage?.getEd25519SeedBytes();

      if (_client != null && endpointId != null && seed != null) {
        final res = await _client.depositCard(
          endpointId: endpointId,
          privateKeySeed: seed,
          amount: amount,
          description: 'Zoop Top-up - Card',
        );
        result = PaymentInitiationResult.fromJson(res);
      } else {
        result = PaymentInitiationResult(
          reference: 'CARD-${DateTime.now().millisecondsSinceEpoch}',
          status: 'pending',
          provider: 'Card',
          redirectUrl: 'https://checkout.zoop.network/pay/${DateTime.now().millisecondsSinceEpoch}',
        );
      }

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.deposit,
        amount: amount,
        description: 'Top-up via Visa / Mastercard',
        timestamp: DateTime.now(),
        status: TransactionStatus.pending,
        referenceId: result.reference,
        paymentMethod: PaymentMethodType.card,
        redirectUrl: result.redirectUrl,
      );

      state = state.copyWith(
        availableBalance: state.availableBalance + amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Withdraw earnings to Mobile Money (MTN or Airtel) via the cloud server
  Future<PaymentInitiationResult> withdrawToMobileMoney({
    required double amount,
    required String phoneNumber,
    String? provider,
  }) async {
    if (amount > state.unwithdrawnEarnings) {
      throw Exception('Amount exceeds available unwithdrawn earnings');
    }

    state = state.copyWith(isLoading: true);
    try {
      final detected = PhoneUtils.detectUgandaNetwork(phoneNumber);
      final netProvider = provider ?? (detected == 'airtel' ? 'airtel' : 'mtn');
      final isMtn = netProvider.toLowerCase().contains('mtn');

      PaymentInitiationResult result;
      final endpointId = await _storage?.getEndpointId();
      final seed = await _storage?.getEd25519SeedBytes();

      if (_client != null && endpointId != null && seed != null) {
        final res = await _client.withdrawMobileMoney(
          endpointId: endpointId,
          privateKeySeed: seed,
          amount: amount,
          phoneNumber: phoneNumber,
          provider: netProvider,
          description: 'Zoop Provider Earnings Payout',
        );
        result = PaymentInitiationResult.fromJson(res);
      } else {
        result = PaymentInitiationResult(
          reference: 'WD-${DateTime.now().millisecondsSinceEpoch}',
          status: 'completed',
          provider: isMtn ? 'MTN' : 'Airtel',
          providerReference: 'SIM-${DateTime.now().millisecondsSinceEpoch}',
        );
      }

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.withdrawal,
        amount: amount,
        description: 'Earnings payout to ${isMtn ? "MTN Mobile Money" : "Airtel Money"} ($phoneNumber)',
        timestamp: DateTime.now(),
        status: TransactionStatus.completed,
        referenceId: result.reference,
        paymentMethod: isMtn ? PaymentMethodType.mtnMobileMoney : PaymentMethodType.airtelMoney,
        phoneNumber: phoneNumber,
        providerReference: result.providerReference,
      );

      state = state.copyWith(
        unwithdrawnEarnings: state.unwithdrawnEarnings - amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Asynchronously polls cloud server for payment confirmation (e.g. USSD prompt PIN entry).
  /// Handles USSD push timeout if user does not approve within [timeoutSeconds] (default 60s).
  Future<String> pollTransactionStatus(
    String referenceId, {
    int timeoutSeconds = 60,
    Duration initialInterval = const Duration(seconds: 2),
  }) async {
    final endpointId = await _storage?.getEndpointId();
    final seed = await _storage?.getEd25519SeedBytes();
    if (_client == null || endpointId == null || seed == null) {
      return 'completed';
    }

    final stopwatch = Stopwatch()..start();
    Duration currentInterval = initialInterval;

    while (stopwatch.elapsed.inSeconds < timeoutSeconds) {
      await Future.delayed(currentInterval);
      try {
        final statusRes = await _client.checkTransactionStatus(
          endpointId: endpointId,
          privateKeySeed: seed,
          referenceId: referenceId,
        );

        final statusStr = (statusRes['status'] as String? ?? 'pending').toLowerCase();

        if (statusStr == 'completed' || statusStr == 'success') {
          _updateTransactionStatus(referenceId, TransactionStatus.completed);
          await refreshBalance();
          return 'completed';
        } else if (statusStr == 'failed' || statusStr == 'declined' || statusStr == 'cancelled') {
          _updateTransactionStatus(referenceId, TransactionStatus.failed);
          return 'failed';
        }
      } catch (_) {
        // Continue polling on transient network error
      }

      // Progressive backoff interval up to 8s
      if (currentInterval.inSeconds < 8) {
        currentInterval += const Duration(seconds: 1);
      }
    }

    // USSD prompt confirmation timed out
    state = state.copyWith(
      errorMessage: 'USSD prompt confirmation timed out. Check telecom SMS or retry.',
    );
    return 'timeout';
  }

  void _updateTransactionStatus(String referenceId, TransactionStatus newStatus) {
    final updatedTxs = state.transactions.map((tx) {
      if (tx.referenceId == referenceId) {
        return tx.copyWith(status: newStatus);
      }
      return tx;
    }).toList();
    state = state.copyWith(transactions: updatedTxs);
  }

  /// Sync balance from cloud server with offline resilience
  Future<void> refreshBalance() async {
    try {
      final endpointId = await _storage?.getEndpointId();
      final seed = await _storage?.getEd25519SeedBytes();
      if (_client != null && endpointId != null && seed != null) {
        final data = await _client.getWallet(
          endpointId: endpointId,
          privateKeySeed: seed,
        );
        if (data.isNotEmpty) {
          final avail = (data['available_balance'] as num?)?.toDouble() ?? state.availableBalance;
          final pending = (data['pending_balance'] as num?)?.toDouble() ?? state.pendingBalance;
          final earned = (data['total_earned'] as num?)?.toDouble() ?? state.totalEarnedSharing;
          final unwithdrawn = (data['unwithdrawn_earnings'] as num?)?.toDouble() ?? state.unwithdrawnEarnings;
          final cur = (data['currency'] as String?) ?? state.currency;

          state = state.copyWith(
            availableBalance: avail,
            pendingBalance: pending,
            totalEarnedSharing: earned,
            unwithdrawnEarnings: unwithdrawn,
            currency: cur,
            isOffline: false,
          );
          return;
        }
      }
    } catch (_) {
      state = state.copyWith(isOffline: true);
    }
  }

  /// Sync transactions from cloud server with offline resilience
  Future<void> refreshTransactions() async {
    try {
      final endpointId = await _storage?.getEndpointId();
      final seed = await _storage?.getEd25519SeedBytes();
      if (_client != null && endpointId != null && seed != null) {
        final res = await _client.listWalletTransactions(
          endpointId: endpointId,
          privateKeySeed: seed,
        );
        final rawList = res['transactions'];
        if (rawList is List && rawList.isNotEmpty) {
          final serverItems = rawList
              .whereType<Map<String, dynamic>>()
              .map((j) => WalletTransactionItem.fromJson(j))
              .toList();
          state = state.copyWith(transactions: serverItems, isOffline: false);
          return;
        }
      }
    } catch (_) {
      state = state.copyWith(isOffline: true);
    }
  }

  /// Refresh all wallet data including balance and transactions from server
  Future<void> refreshAll() async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);
    try {
      await refreshBalance();
      await refreshTransactions();
      state = state.copyWith(isLoading: false, clearErrorMessage: true);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isOffline: true,
        errorMessage: 'Unable to sync wallet with server: $e',
      );
    }
  }

  // Compatibility helpers for existing callers
  void addFunds(double amount, String method) {
    final isMtn = method.toLowerCase().contains('mtn');
    final isAirtel = method.toLowerCase().contains('airtel');
    final isCard = method.toLowerCase().contains('card');

    final paymentMethod = isMtn
        ? PaymentMethodType.mtnMobileMoney
        : isAirtel
            ? PaymentMethodType.airtelMoney
            : isCard
                ? PaymentMethodType.card
                : PaymentMethodType.meshInternal;

    final newTx = WalletTransactionItem(
      id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
      type: TransactionType.deposit,
      amount: amount,
      description: 'Account top-up via $method',
      timestamp: DateTime.now(),
      status: TransactionStatus.completed,
      referenceId: 'REF-ADD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      paymentMethod: paymentMethod,
    );

    state = state.copyWith(
      availableBalance: state.availableBalance + amount,
      transactions: [newTx, ...state.transactions],
    );
  }

  void withdrawEarnings(double amount, String destination) {
    if (amount > state.unwithdrawnEarnings) return;

    final isMtn = destination.toLowerCase().contains('mtn');
    final isAirtel = destination.toLowerCase().contains('airtel');

    final paymentMethod = isMtn
        ? PaymentMethodType.mtnMobileMoney
        : isAirtel
            ? PaymentMethodType.airtelMoney
            : PaymentMethodType.meshInternal;

    final newTx = WalletTransactionItem(
      id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
      type: TransactionType.withdrawal,
      amount: amount,
      description: 'Earnings payout to $destination',
      timestamp: DateTime.now(),
      status: TransactionStatus.completed,
      referenceId: 'REF-WD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      paymentMethod: paymentMethod,
      phoneNumber: destination,
    );

    state = state.copyWith(
      unwithdrawnEarnings: state.unwithdrawnEarnings - amount,
      transactions: [newTx, ...state.transactions],
    );
  }
}

final walletProvider =
    StateNotifierProvider<WalletNotifier, WalletState>((ref) {
  final client = ref.watch(cloudApiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  final notifier = WalletNotifier(
    cloudApiClient: client,
    storageService: storage,
  );
  Future.microtask(() {
    notifier.refreshBalance();
    notifier.refreshTransactions();
  });
  return notifier;
});
