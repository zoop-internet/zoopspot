import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../sharing/application/sharing_notifier.dart';

/// Interactive banner on Dashboard indicating active hotspot sharing.
class ActiveSharingBanner extends StatelessWidget {
  final SharingState sharing;

  const ActiveSharingBanner({
    super.key,
    required this.sharing,
  });

  @override
  Widget build(BuildContext context) {
    final count = sharing.recipients.length;
    return Semantics(
      button: true,
      label:
          'Sharing active: $count ${count == 1 ? "peer" : "peers"} connected at ${sharing.currentEgressMbps.toStringAsFixed(1)} megabits per second. Tap to manage sharing.',
      child: GestureDetector(
        onTap: () => context.go('/sharing'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: ZoopColors.accentGreen.withValues(alpha: 0.12),
            borderRadius: ZoopSpacing.radiusLg,
            border: Border.all(
              color: ZoopColors.accentGreen.withValues(alpha: 0.35),
              width: 1.0,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: ZoopColors.accentGreen,
                ),
              ),
              ZoopSpacing.gapSm,
              Expanded(
                child: Row(
                  children: [
                    const Text(
                      'SHARING ACTIVE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: ZoopColors.accentGreen,
                        letterSpacing: 0.5,
                      ),
                    ),
                    ZoopSpacing.gapSm,
                    Expanded(
                      child: Text(
                        '• $count ${count == 1 ? 'peer' : 'peers'} (${sharing.currentEgressMbps.toStringAsFixed(1)} Mbps)',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: ZoopColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 12,
                color: ZoopColors.accentGreen,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
