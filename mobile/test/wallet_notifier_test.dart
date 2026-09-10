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
      expect(state.availableBalance, equals(85000.0));
      expect(state.totalEarnedSharing, equals(182500.0));
      expect(state.unwithdrawnEarnings, equals(62000.0));
      expect(state.currency, equals('UGX'));
      expect(state.transactions.isNotEmpty, isTrue);
    });

    test('Adding funds increases available balance and prepends deposit transaction', () {
      final initialBalance = notifier.state.availableBalance;
      final initialTxCount = notifier.state.transactions.length;

      notifier.addFunds(50000.0, 'MTN Mobile Money');

      expect(notifier.state.availableBalance, equals(initialBalance + 50000.0));
      expect(notifier.state.transactions.length, equals(initialTxCount + 1));
      expect(notifier.state.transactions.first.type, equals(TransactionType.deposit));
      expect(notifier.state.transactions.first.amount, equals(50000.0));
    });

    test('Withdrawing earnings reduces unwithdrawn amount and adds withdrawal transaction', () {
      final initialEarnings = notifier.state.unwithdrawnEarnings;
      final initialTxCount = notifier.state.transactions.length;

      notifier.withdrawEarnings(10000.0, '+256772123456');

      expect(notifier.state.unwithdrawnEarnings, equals(initialEarnings - 10000.0));
      expect(notifier.state.transactions.length, equals(initialTxCount + 1));
      expect(notifier.state.transactions.first.type, equals(TransactionType.withdrawal));
      expect(notifier.state.transactions.first.amount, equals(10000.0));
    });

    test('Cannot withdraw more than available earnings', () {
      final initialEarnings = notifier.state.unwithdrawnEarnings;
      final initialTxCount = notifier.state.transactions.length;

      notifier.withdrawEarnings(initialEarnings + 100000.0, '+256772123456');

      expect(notifier.state.unwithdrawnEarnings, equals(initialEarnings));
      expect(notifier.state.transactions.length, equals(initialTxCount));
    });

    test('refreshAll completes and sets loading to false', () async {
      await notifier.refreshAll();
      expect(notifier.state.isLoading, isFalse);
      expect(notifier.state.errorMessage, isNull);
    });

    test('WalletState supports offline and error message properties', () {
      final state = const WalletState().copyWith(
        isOffline: true,
        errorMessage: 'Network error',
      );
      expect(state.isOffline, isTrue);
      expect(state.errorMessage, equals('Network error'));

      final cleared = state.copyWith(clearErrorMessage: true);
      expect(cleared.errorMessage, isNull);
    });
  });
}
