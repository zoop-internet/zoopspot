import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../wallet/application/wallet_notifier.dart';

/// Zoop Points and wallet balance overview card displayed on the Dashboard.
/// Implemented as a ConsumerWidget to isolate wallet balance rebuilds.
class ZoopPointsCard extends ConsumerWidget {
  final WalletState? walletState;

  const ZoopPointsCard({
    super.key,
    this.walletState,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final WalletState state = walletState ?? ref.watch(walletProvider);
    final points = (state.availableBalance / 100).toInt();
    final formattedPoints = points.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
    final recentTx = state.transactions.isNotEmpty
        ? state.transactions.first
        : null;
    final recentGain =
        recentTx != null ? '+${(recentTx.amount / 100).toInt()} ZP' : '+45 ZP';

    return Semantics(
      button: true,
      label:
          'Zoop Points: $formattedPoints ZP. Available balance: ${state.formatAmount(state.availableBalance)}. Tap to view wallet details.',
      child: GestureDetector(
        onTap: () => context.go('/wallet'),
        child: Container(
          padding: ZoopSpacing.cardPadding,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [
                Color(0xFF131C2D),
                Color(0xFF0E131E),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: ZoopSpacing.radiusXl,
            border: Border.all(
              color: ZoopColors.primaryCyan.withValues(alpha: 0.22),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Label + Recent Points Gain
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                          borderRadius: ZoopSpacing.radiusSm,
                        ),
                        child: const Icon(
                          Icons.auto_awesome,
                          size: 13,
                          color: ZoopColors.primaryCyan,
                        ),
                      ),
                      const SizedBox(width: 7),
                      const Text(
                        'ZOOP POINTS',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: ZoopColors.textSecondary,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                      borderRadius: ZoopSpacing.radiusSm,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.arrow_upward_rounded,
                          size: 11,
                          color: ZoopColors.accentGreen,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          recentGain,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: ZoopColors.accentGreen,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              ZoopSpacing.gapSm,

              // Middle Row: Big Points Display
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    formattedPoints,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: ZoopColors.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      borderRadius: ZoopSpacing.radiusSm,
                    ),
                    child: const Text(
                      'ZP',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: ZoopColors.primaryCyan,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 13,
                    color: ZoopColors.textMuted,
                  ),
                ],
              ),

              ZoopSpacing.gapSm,

              // Bottom Micro-Info
              Text(
                'Available: ${state.formatAmount(state.availableBalance)} • Min. 100 ZP',
                style: const TextStyle(
                  fontSize: 10.5,
                  color: ZoopColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
