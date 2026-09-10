import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import 'payment_brand_icon.dart';

/// Supported settlement rails display card.
class WalletSettlementCard extends StatelessWidget {
  const WalletSettlementCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: ZoopSpacing.cardPadding,
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: ZoopSpacing.radiusLg,
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.payments_outlined, color: ZoopColors.primaryCyan, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Supported Payment Rails',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'Instant Settlement',
                  style: TextStyle(
                    fontSize: 10,
                    color: ZoopColors.accentGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              PaymentBrandBadge.mtn(),
              PaymentBrandBadge.airtel(),
              PaymentBrandBadge.card(),
            ],
          ),
        ],
      ),
    );
  }
}
