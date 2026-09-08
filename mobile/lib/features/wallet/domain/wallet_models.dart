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

class WalletTransactionItem {
  final String id;
  final TransactionType type;
  final double amountUsd;
  final String description;
  final DateTime timestamp;
  final TransactionStatus status;
  final String referenceId;

  const WalletTransactionItem({
    required this.id,
    required this.type,
    required this.amountUsd,
    required this.description,
    required this.timestamp,
    required this.status,
    required this.referenceId,
  });

  bool get isPositive =>
      type == TransactionType.deposit || type == TransactionType.sharingEarning;

  String get formattedAmount {
    final prefix = isPositive ? '+' : '-';
    return '$prefix\$${amountUsd.toStringAsFixed(2)}';
  }
}
