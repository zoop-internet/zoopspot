import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/wallet/application/wallet_notifier.dart';
import 'package:zoop_mobile/features/wallet/domain/wallet_models.dart';

void main() {
  group('WalletNotifier Tests', () {
    late WalletNotifier notifier;

    setUp(() {
      notifier = WalletNotifier();
    });

    test('Initial state loads balance, earnings, and transaction history', () {
      final state = notifier.state;
      expect(state.availableBalanceUsd, equals(24.50));
      expect(state.totalEarnedSharingUsd, equals(48.20));
      expect(state.unwithdrawnEarningsUsd, equals(16.80));
      expect(state.transactions.isNotEmpty, isTrue);
    });

    test('Adding funds increases available balance and prepends deposit transaction', () {
      final initialBalance = notifier.state.availableBalanceUsd;
      final initialTxCount = notifier.state.transactions.length;

      notifier.addFunds(50.0, 'USDC (Polygon)');

      expect(notifier.state.availableBalanceUsd, equals(initialBalance + 50.0));
      expect(notifier.state.transactions.length, equals(initialTxCount + 1));
      expect(notifier.state.transactions.first.type, equals(TransactionType.deposit));
      expect(notifier.state.transactions.first.amountUsd, equals(50.0));
    });

    test('Withdrawing earnings reduces unwithdrawn amount and adds withdrawal transaction', () {
      final initialEarnings = notifier.state.unwithdrawnEarningsUsd;
      final initialTxCount = notifier.state.transactions.length;

      notifier.withdrawEarnings(10.0, '0xRecipientAddress');

      expect(notifier.state.unwithdrawnEarningsUsd, equals(initialEarnings - 10.0));
      expect(notifier.state.transactions.length, equals(initialTxCount + 1));
      expect(notifier.state.transactions.first.type, equals(TransactionType.withdrawal));
      expect(notifier.state.transactions.first.amountUsd, equals(10.0));
    });

    test('Cannot withdraw more than available earnings', () {
      final initialEarnings = notifier.state.unwithdrawnEarningsUsd;
      final initialTxCount = notifier.state.transactions.length;

      notifier.withdrawEarnings(initialEarnings + 100.0, '0xRecipientAddress');

      expect(notifier.state.unwithdrawnEarningsUsd, equals(initialEarnings));
      expect(notifier.state.transactions.length, equals(initialTxCount));
    });
  });
}
