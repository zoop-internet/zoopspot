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
        return 'Internet Usage';
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

  IconData get icon {
    switch (this) {
      case TransactionStatus.completed:
        return Icons.check_circle_outline;
      case TransactionStatus.pending:
        return Icons.schedule;
      case TransactionStatus.failed:
        return Icons.error_outline;
    }
  }

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
        return 'Zoop Protocol';
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

  factory WalletTransactionItem.fromJson(Map<String, dynamic> json) {
    final typeStr = (json['type'] ?? 'deposit').toString().toLowerCase();
    final txType = typeStr == 'deposit'
        ? TransactionType.deposit
        : (typeStr == 'withdrawal'
            ? TransactionType.withdrawal
            : (typeStr == 'earning'
                ? TransactionType.sharingEarning
                : TransactionType.bandwidthSpend));

    final statusStr = (json['status'] ?? 'pending').toString().toLowerCase();
    final txStatus = statusStr == 'completed'
        ? TransactionStatus.completed
        : (statusStr == 'failed' || statusStr == 'reversed'
            ? TransactionStatus.failed
            : TransactionStatus.pending);

    final methodStr = (json['payment_method'] ?? '').toString().toLowerCase();
    final pm = methodStr.contains('mtn')
        ? PaymentMethodType.mtnMobileMoney
        : (methodStr.contains('airtel')
            ? PaymentMethodType.airtelMoney
            : (methodStr.contains('card')
                ? PaymentMethodType.card
                : PaymentMethodType.meshInternal));

    DateTime parsedDate = DateTime.now();
    final rawDate = json['created_at'] ?? json['timestamp'];
    if (rawDate is String && rawDate.isNotEmpty) {
      parsedDate = DateTime.tryParse(rawDate) ?? DateTime.now();
    }

    final rawAmount = json['amount'];
    final amountVal = (rawAmount is num) ? rawAmount.toDouble() : 0.0;

    return WalletTransactionItem(
      id: (json['id'] ?? '').toString(),
      type: txType,
      amount: amountVal,
      currency: (json['currency'] ?? 'UGX').toString(),
      description: (json['description'] ?? '').toString(),
      timestamp: parsedDate,
      status: txStatus,
      referenceId: (json['reference_id'] ?? json['id'] ?? '').toString(),
      paymentMethod: pm,
      phoneNumber: json['phone_number'] as String?,
      providerReference: (json['gateway_reference'] ?? json['provider_reference']) as String?,
      redirectUrl: json['redirect_url'] as String?,
    );
  }

  WalletTransactionItem copyWith({
    String? id,
    TransactionType? type,
    double? amount,
    String? currency,
    String? description,
    DateTime? timestamp,
    TransactionStatus? status,
    String? referenceId,
    PaymentMethodType? paymentMethod,
    String? phoneNumber,
    String? providerReference,
    String? redirectUrl,
  }) {
    return WalletTransactionItem(
      id: id ?? this.id,
      type: type ?? this.type,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      description: description ?? this.description,
      timestamp: timestamp ?? this.timestamp,
      status: status ?? this.status,
      referenceId: referenceId ?? this.referenceId,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      providerReference: providerReference ?? this.providerReference,
      redirectUrl: redirectUrl ?? this.redirectUrl,
    );
  }
}

/// Result of initiating a payment (deposit or withdrawal) via the server
class PaymentInitiationResult {
  final String reference;
  final String status;
  final String? redirectUrl;
  final String? provider;
  final String? providerReference;

  const PaymentInitiationResult({
    required this.reference,
    required this.status,
    this.redirectUrl,
    this.provider,
    this.providerReference,
  });

  factory PaymentInitiationResult.fromJson(Map<String, dynamic> json) {
    return PaymentInitiationResult(
      reference: (json['reference_id'] ?? json['reference'] ?? json['id'] ?? '') as String,
      status: (json['status'] ?? 'pending') as String,
      redirectUrl: json['redirect_url'] as String?,
      provider: json['provider'] as String?,
      providerReference: (json['gateway_reference'] ?? json['provider_reference']) as String?,
    );
  }
}
