import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../domain/wallet_models.dart';

class TransactionDetailSheet extends StatelessWidget {
  final WalletTransactionItem transaction;

  const TransactionDetailSheet({super.key, required this.transaction});

  static Future<void> show(BuildContext context, WalletTransactionItem transaction) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TransactionDetailSheet(transaction: transaction),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formattedTime =
        '${transaction.timestamp.year}-${transaction.timestamp.month.toString().padLeft(2, '0')}-${transaction.timestamp.day.toString().padLeft(2, '0')} ${transaction.timestamp.hour.toString().padLeft(2, '0')}:${transaction.timestamp.minute.toString().padLeft(2, '0')} UTC';

    return Container(
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Drag Handle
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // Transaction Icon & Status
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: transaction.type.color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: transaction.type.color.withValues(alpha: 0.3),
                    width: 1.5,
                  ),
                ),
                child: Icon(
                  transaction.type.icon,
                  color: transaction.type.color,
                  size: 28,
                ),
              ),
              const SizedBox(height: 14),

              Text(
                transaction.formattedAmount,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: transaction.type.color,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: transaction.status.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: transaction.status.color.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  transaction.status.name.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: transaction.status.color,
                    letterSpacing: 0.5,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Metadata card
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    _buildRow('Category', transaction.type.label),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildRow('Payment Rail', transaction.paymentMethod.label),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildRow('Description', transaction.description),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildRow(
                      'Timestamp',
                      formattedTime,
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildCopyableRow(
                      context,
                      'Reference ID',
                      transaction.referenceId,
                    ),
                    if (transaction.providerReference != null && transaction.providerReference!.isNotEmpty) ...[
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      _buildCopyableRow(
                        context,
                        'Provider Reference',
                        transaction.providerReference!,
                      ),
                    ],
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildRow('Payment Gateway', 'MarzPay (MTN, Airtel & Card)'),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Close Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.surfaceElevated,
                    foregroundColor: ZoopColors.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: ZoopColors.surfaceBorder),
                    ),
                  ),
                  child: const Text(
                    'Done',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: ZoopColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCopyableRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
          ),
          const SizedBox(width: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                value.length > 16 ? '${value.substring(0, 10)}...${value.substring(value.length - 6)}' : value,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: ZoopColors.primaryCyan,
                  fontFamily: 'monospace',
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 16, color: ZoopColors.textSecondary),
                padding: const EdgeInsets.only(left: 6),
                constraints: const BoxConstraints(),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: value));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Reference ID copied to clipboard'),
                      backgroundColor: ZoopColors.accentGreen,
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
