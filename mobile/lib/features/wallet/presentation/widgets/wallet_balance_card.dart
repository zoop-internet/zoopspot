import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_button.dart';
import '../../application/wallet_notifier.dart';

/// Available prepaid mesh balance display card with Add Funds CTA.
class WalletBalanceCard extends StatelessWidget {
  final WalletState state;
  final VoidCallback onAddFunds;

  const WalletBalanceCard({
    super.key,
    required this.state,
    required this.onAddFunds,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D2538), ZoopColors.surface],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: ZoopSpacing.radiusXl,
        border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Available Zoop Balance',
                style: TextStyle(fontSize: 13, color: ZoopColors.textSecondary),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                  borderRadius: ZoopSpacing.radiusSm,
                ),
                child: const Text(
                  'Prepaid',
                  style: TextStyle(
                    fontSize: 10,
                    color: ZoopColors.primaryCyan,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          ZoopSpacing.gapSm,
          Text(
            state.formatAmount(state.availableBalance),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: ZoopColors.textPrimary,
              letterSpacing: -0.5,
            ),
          ),
          ZoopSpacing.gapLg,
          ZoopButton.primary(
            label: 'Add Funds',
            icon: Icons.add_circle_outline,
            onPressed: onAddFunds,
            isFullWidth: true,
            semanticsLabel: 'Add funds to prepaid Zoop balance',
          ),
        ],
      ),
    );
  }
}
