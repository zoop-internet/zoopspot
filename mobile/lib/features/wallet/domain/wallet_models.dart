import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum TransactionType {
  deposit,
  withdrawal,
  sharingEarning,
  bandwidthSpend;

  String get label {
    switch (this) {
      case TransactionType.deposit:
        return 'Funds Added';
      case TransactionType.withdrawal:
        return 'Earnings Payout';
      case TransactionType.sharingEarning:
        return 'Provider Egress Reward';
      case TransactionType.bandwidthSpend:
        return 'Mesh Bandwidth Usage';
    }
  }

  IconData get icon {
    switch (this) {
      case TransactionType.deposit:
        return Icons.add_circle_outline;
      case TransactionType.withdrawal:
        return Icons.arrow_outward;
      case TransactionType.sharingEarning:
        return Icons.arrow_downward;
      case TransactionType.bandwidthSpend:
        return Icons.receipt_long;
    }
  }

  Color get color {
    switch (this) {
      case TransactionType.deposit:
      case TransactionType.sharingEarning:
        return ZoopColors.accentGreen;
      case TransactionType.withdrawal:
        return ZoopColors.primaryCyan;
      case TransactionType.bandwidthSpend:
        return ZoopColors.accentAmber;
    }
  }
}

enum TransactionStatus {
  completed,
  pending,
  failed;

  Color get color {
    switch (this) {
      case TransactionStatus.completed:
        return ZoopColors.accentGreen;
      case TransactionStatus.pending:
        return ZoopColors.accentAmber;
      case TransactionStatus.failed:
        return ZoopColors.accentRose;
    }
  }
}

enum PaymentMethodType {
  mtnMobileMoney,
  airtelMoney,
  card,
  meshInternal;

  String get label {
    switch (this) {
      case PaymentMethodType.mtnMobileMoney:
        return 'MTN Mobile Money';
      case PaymentMethodType.airtelMoney:
        return 'Airtel Money';
      case PaymentMethodType.card:
        return 'Visa / Mastercard';
      case PaymentMethodType.meshInternal:
        return 'Mesh Protocol';
    }
  }

  IconData get icon {
    switch (this) {
      case PaymentMethodType.mtnMobileMoney:
      case PaymentMethodType.airtelMoney:
        return Icons.phone_android_rounded;
      case PaymentMethodType.card:
        return Icons.credit_card_rounded;
      case PaymentMethodType.meshInternal:
        return Icons.hub_outlined;
    }
  }

  Color get color {
    switch (this) {
      case PaymentMethodType.mtnMobileMoney:
        return const Color(0xFFFFCC00); // MTN Yellow
      case PaymentMethodType.airtelMoney:
        return const Color(0xFFFF2020); // Airtel Red
      case PaymentMethodType.card:
        return ZoopColors.primaryCyan;
      case PaymentMethodType.meshInternal:
        return ZoopColors.accentPurple;
    }
  }
}

class WalletTransactionItem {
  final String id;
  final TransactionType type;
  final double amount;
  final String currency;
  final String description;
  final DateTime timestamp;
  final TransactionStatus status;
  final String referenceId;
  final PaymentMethodType paymentMethod;
  final String? phoneNumber;
  final String? providerReference;
  final String? redirectUrl;

  const WalletTransactionItem({
    required this.id,
    required this.type,
    required this.amount,
    this.currency = 'UGX',
    required this.description,
    required this.timestamp,
    required this.status,
    required this.referenceId,
    this.paymentMethod = PaymentMethodType.meshInternal,
    this.phoneNumber,
    this.providerReference,
    this.redirectUrl,
  });

  /// Backward compatibility alias
  double get amountUsd => amount;

  bool get isPositive =>
      type == TransactionType.deposit || type == TransactionType.sharingEarning;

  String get formattedAmount {
    final prefix = isPositive ? '+' : '-';
    final formattedNum = amount.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
    return '$prefix$currency $formattedNum';
  }
}
