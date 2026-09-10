import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../domain/sharing_models.dart';

/// Card tile representing a connected recipient peer with transfer telemetry
/// and session controls.
class SharingRecipientCard extends StatelessWidget {
  final ConnectedRecipientItem recipient;
  final VoidCallback onTap;
  final VoidCallback onDisconnect;

  const SharingRecipientCard({
    super.key,
    required this.recipient,
    required this.onTap,
    required this.onDisconnect,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label:
          'Connected peer ${recipient.name}, device ${recipient.peerZoopId} on ${recipient.platform}. Relaying at ${recipient.formattedRate}, transferred ${recipient.formattedTransferred}. Tap to view session details.',
      child: Container(
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: ZoopSpacing.radiusLg,
          border: Border.all(
            color: ZoopColors.accentGreen.withValues(alpha: 0.3),
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: ZoopSpacing.radiusLg,
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.devices_rounded,
                          color: ZoopColors.accentGreen,
                          size: 18,
                        ),
                      ),
                      ZoopSpacing.gapMd,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              recipient.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: ZoopColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${recipient.peerZoopId} • ${recipient.platform}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: ZoopColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Semantics(
                        button: true,
                        label: 'Disconnect ${recipient.name}',
                        child: IconButton(
                          icon: const Icon(Icons.close_rounded,
                              size: 18, color: ZoopColors.textMuted),
                          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                          tooltip: 'Disconnect',
                          onPressed: onDisconnect,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Divider(color: ZoopColors.surfaceBorder, height: 1),
                  ZoopSpacing.gapSm,
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.speed,
                              size: 13, color: ZoopColors.accentGreen),
                          ZoopSpacing.gapXs,
                          Text(
                            recipient.formattedRate,
                            style: const TextStyle(
                              fontSize: 11,
                              color: ZoopColors.accentGreen,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          ZoopSpacing.gapMd,
                          const Icon(Icons.data_usage,
                              size: 13, color: ZoopColors.textMuted),
                          ZoopSpacing.gapXs,
                          Text(
                            recipient.formattedTransferred,
                            style: const TextStyle(
                              fontSize: 11,
                              color: ZoopColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Connected ${recipient.formattedDuration}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: ZoopColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
