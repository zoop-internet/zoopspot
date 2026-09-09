import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/marzpay_api_client.dart';
import '../domain/wallet_models.dart';

final marzPayClientProvider = Provider<MarzPayApiClient>((ref) {
  return MarzPayApiClient();
});

class WalletState {
  final double availableBalance;
  final double pendingBalance;
  final double totalEarnedSharing;
  final double unwithdrawnEarnings;
  final double totalDataServedGb;
  final String currency;
  final List<WalletTransactionItem> transactions;
  final bool isLoading;

  const WalletState({
    this.availableBalance = 85000.0,
    this.pendingBalance = 5000.0,
    this.totalEarnedSharing = 182500.0,
    this.unwithdrawnEarnings = 62000.0,
    this.totalDataServedGb = 248.5,
    this.currency = 'UGX',
    this.transactions = const [],
    this.isLoading = false,
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
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  final MarzPayApiClient _marzPayClient;

  WalletNotifier({MarzPayApiClient? client})
      : _marzPayClient = client ?? MarzPayApiClient(),
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

  /// Deposit funds via Mobile Money (MTN or Airtel) using MarzPay
  Future<MarzPayCollectionResult> addFundsViaMobileMoney({
    required double amount,
    required String phoneNumber,
    String? provider,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final res = await _marzPayClient.collectMobileMoney(
        amount: amount,
        phoneNumber: phoneNumber,
        country: 'UG',
        description: 'Zoop Mesh Top-up',
      );

      final detected = MarzPayApiClient.detectUgandaNetwork(phoneNumber);
      final isMtn = (provider?.toLowerCase() == 'mtn') || (detected == 'mtn');

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.deposit,
        amount: amount,
        description: 'Top-up via ${isMtn ? "MTN Mobile Money" : "Airtel Money"} ($phoneNumber)',
        timestamp: DateTime.now(),
        status: TransactionStatus.pending,
        referenceId: res.reference,
        paymentMethod: isMtn ? PaymentMethodType.mtnMobileMoney : PaymentMethodType.airtelMoney,
        phoneNumber: phoneNumber,
        providerReference: res.provider,
      );

      state = state.copyWith(
        availableBalance: state.availableBalance + amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Deposit funds via Card using MarzPay
  Future<MarzPayCollectionResult> addFundsViaCard({
    required double amount,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final res = await _marzPayClient.collectCard(
        amount: amount,
        country: 'UG',
        description: 'Zoop Mesh Top-up - Card',
      );

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.deposit,
        amount: amount,
        description: 'Top-up via Visa / Mastercard',
        timestamp: DateTime.now(),
        status: TransactionStatus.pending,
        referenceId: res.reference,
        paymentMethod: PaymentMethodType.card,
        redirectUrl: res.redirectUrl,
      );

      state = state.copyWith(
        availableBalance: state.availableBalance + amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Withdraw earnings to Mobile Money (MTN or Airtel) using MarzPay
  Future<MarzPayDisbursementResult> withdrawToMobileMoney({
    required double amount,
    required String phoneNumber,
    String? provider,
  }) async {
    if (amount > state.unwithdrawnEarnings) {
      throw Exception('Amount exceeds available unwithdrawn earnings');
    }

    state = state.copyWith(isLoading: true);
    try {
      final res = await _marzPayClient.sendMoney(
        amount: amount,
        phoneNumber: phoneNumber,
        country: 'UG',
        description: 'Zoop Provider Earnings Payout',
      );

      final detected = MarzPayApiClient.detectUgandaNetwork(phoneNumber);
      final isMtn = (provider?.toLowerCase() == 'mtn') || (detected == 'mtn');

      final newTx = WalletTransactionItem(
        id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.withdrawal,
        amount: amount,
        description: 'Earnings payout to ${isMtn ? "MTN Mobile Money" : "Airtel Money"} ($phoneNumber)',
        timestamp: DateTime.now(),
        status: TransactionStatus.completed,
        referenceId: res.reference,
        paymentMethod: isMtn ? PaymentMethodType.mtnMobileMoney : PaymentMethodType.airtelMoney,
        phoneNumber: phoneNumber,
        providerReference: res.providerReference,
      );

      state = state.copyWith(
        unwithdrawnEarnings: state.unwithdrawnEarnings - amount,
        transactions: [newTx, ...state.transactions],
        isLoading: false,
      );

      return res;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  /// Sync balance from MarzPay API
  Future<void> refreshBalance() async {
    try {
      final bal = await _marzPayClient.getBalance(country: 'UG');
      state = state.copyWith(
        availableBalance: bal.availableBalance.raw,
        currency: bal.currency,
      );
    } catch (_) {
      // Keep local state on error
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
  final client = ref.watch(marzPayClientProvider);
  return WalletNotifier(client: client);
});
