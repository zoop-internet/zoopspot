import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/wallet_models.dart';

class WalletState {
  final double availableBalanceUsd;
  final double pendingBalanceUsd;
  final double totalEarnedSharingUsd;
  final double unwithdrawnEarningsUsd;
  final double totalDataServedGb;
  final List<WalletTransactionItem> transactions;

  const WalletState({
    this.availableBalanceUsd = 24.50,
    this.pendingBalanceUsd = 1.20,
    this.totalEarnedSharingUsd = 48.20,
    this.unwithdrawnEarningsUsd = 16.80,
    this.totalDataServedGb = 248.5,
    this.transactions = const [],
  });

  WalletState copyWith({
    double? availableBalanceUsd,
    double? pendingBalanceUsd,
    double? totalEarnedSharingUsd,
    double? unwithdrawnEarningsUsd,
    double? totalDataServedGb,
    List<WalletTransactionItem>? transactions,
  }) {
    return WalletState(
      availableBalanceUsd: availableBalanceUsd ?? this.availableBalanceUsd,
      pendingBalanceUsd: pendingBalanceUsd ?? this.pendingBalanceUsd,
      totalEarnedSharingUsd:
          totalEarnedSharingUsd ?? this.totalEarnedSharingUsd,
      unwithdrawnEarningsUsd:
          unwithdrawnEarningsUsd ?? this.unwithdrawnEarningsUsd,
      totalDataServedGb: totalDataServedGb ?? this.totalDataServedGb,
      transactions: transactions ?? this.transactions,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  WalletNotifier() : super(const WalletState()) {
    _loadInitialTransactions();
  }

  void _loadInitialTransactions() {
    final now = DateTime.now();
    final list = [
      WalletTransactionItem(
        id: 'tx-01',
        type: TransactionType.sharingEarning,
        amountUsd: 3.20,
        description: 'Egress traffic relay reward (42.5 GB relayed)',
        timestamp: now.subtract(const Duration(hours: 4)),
        status: TransactionStatus.completed,
        referenceId: 'REF-REWARD-8821',
      ),
      WalletTransactionItem(
        id: 'tx-02',
        type: TransactionType.bandwidthSpend,
        amountUsd: 0.85,
        description: 'P2P WireGuard Tunnel to Zurich Node',
        timestamp: now.subtract(const Duration(hours: 18)),
        status: TransactionStatus.completed,
        referenceId: 'REF-CONSUME-4410',
      ),
      WalletTransactionItem(
        id: 'tx-03',
        type: TransactionType.deposit,
        amountUsd: 20.00,
        description: 'Account top-up via USDC (Polygon)',
        timestamp: now.subtract(const Duration(days: 2)),
        status: TransactionStatus.completed,
        referenceId: '0x3b89...11c4',
      ),
      WalletTransactionItem(
        id: 'tx-04',
        type: TransactionType.withdrawal,
        amountUsd: 30.00,
        description: 'Payout to Lightning Invoice',
        timestamp: now.subtract(const Duration(days: 5)),
        status: TransactionStatus.completed,
        referenceId: 'lnbc300u1p...',
      ),
    ];

    state = state.copyWith(transactions: list);
  }

  void addFunds(double amount, String method) {
    final newTx = WalletTransactionItem(
      id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
      type: TransactionType.deposit,
      amountUsd: amount,
      description: 'Account top-up via $method',
      timestamp: DateTime.now(),
      status: TransactionStatus.completed,
      referenceId: 'REF-ADD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
    );

    state = state.copyWith(
      availableBalanceUsd: state.availableBalanceUsd + amount,
      transactions: [newTx, ...state.transactions],
    );
  }

  void withdrawEarnings(double amount, String destination) {
    if (amount > state.unwithdrawnEarningsUsd) return;

    final newTx = WalletTransactionItem(
      id: 'tx-${DateTime.now().millisecondsSinceEpoch}',
      type: TransactionType.withdrawal,
      amountUsd: amount,
      description: 'Earnings payout to $destination',
      timestamp: DateTime.now(),
      status: TransactionStatus.completed,
      referenceId: 'REF-WD-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
    );

    state = state.copyWith(
      unwithdrawnEarningsUsd: state.unwithdrawnEarningsUsd - amount,
      transactions: [newTx, ...state.transactions],
    );
  }
}

final walletProvider =
    StateNotifierProvider<WalletNotifier, WalletState>((ref) {
  return WalletNotifier();
});
