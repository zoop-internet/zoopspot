import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_button.dart';
import '../../application/wallet_notifier.dart';

/// Provider sharing earnings summary and withdrawal card.
class WalletEarningsCard extends StatelessWidget {
  final WalletState state;
  final VoidCallback onWithdraw;

  const WalletEarningsCard({
    super.key,
    required this.state,
    required this.onWithdraw,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: ZoopSpacing.radiusXl,
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Provider Sharing Earnings',
                style: TextStyle(fontSize: 13, color: ZoopColors.textSecondary),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                  borderRadius: ZoopSpacing.radiusSm,
                ),
                child: const Text(
                  'Active Node',
                  style: TextStyle(
                    fontSize: 10,
                    color: ZoopColors.accentGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          ZoopSpacing.gapSm,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    state.formatAmount(state.totalEarnedSharing),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.accentGreen,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Lifetime earned',
                    style: TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${state.totalDataServedGb} GB',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Total data relayed',
                    style: TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                  ),
                ],
              ),
            ],
          ),
          ZoopSpacing.gapLg,
          const Divider(color: ZoopColors.surfaceBorder),
          ZoopSpacing.gapSm,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Available to Withdraw',
                    style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    state.formatAmount(state.unwithdrawnEarnings),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                ],
              ),
              ZoopButton.secondary(
                label: 'Withdraw',
                icon: Icons.arrow_outward,
                onPressed: onWithdraw,
                semanticsLabel:
                    'Withdraw available provider earnings: ${state.formatAmount(state.unwithdrawnEarnings)}',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
