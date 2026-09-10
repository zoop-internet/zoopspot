import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../devices/domain/fleet_device_model.dart';

/// Mesh Fabric overview summary card showing WireGuard status and active exit route.
class FleetMeshOverviewCard extends StatelessWidget {
  final int onlineCount;
  final int totalCount;
  final FleetDeviceItem? activeExit;
  final VoidCallback onPair;
  final VoidCallback onDisconnectExit;

  const FleetMeshOverviewCard({
    super.key,
    required this.onlineCount,
    required this.totalCount,
    this.activeExit,
    required this.onPair,
    required this.onDisconnectExit,
  });

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
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.hub_outlined, color: ZoopColors.primaryCyan, size: 24),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'WireGuard Mesh',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '10.88.0.0/24 • $onlineCount/$totalCount online',
                      style: const TextStyle(fontSize: 11, color: ZoopColors.accentGreen, fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              ZoopSpacing.gapSm,
              Semantics(
                label: 'Pair new device to WireGuard mesh',
                button: true,
                child: OutlinedButton.icon(
                  onPressed: onPair,
                  icon: const Icon(Icons.qr_code, size: 16),
                  label: const Text('Pair'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(80, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    side: const BorderSide(color: ZoopColors.primaryCyan),
                    foregroundColor: ZoopColors.primaryCyan,
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
          if (activeExit != null) ...[
            ZoopSpacing.gapMd,
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ZoopColors.accentGreen.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_rounded, color: ZoopColors.accentGreen, size: 18),
                  ZoopSpacing.gapSm,
                  Expanded(
                    child: Text(
                      'Routing via ${activeExit!.name} (${activeExit!.ipAddress})',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ZoopColors.accentGreen),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Semantics(
                    label: 'Disconnect exit route via ${activeExit!.name}',
                    button: true,
                    child: InkWell(
                      onTap: onDisconnectExit,
                      borderRadius: ZoopSpacing.radiusSm,
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Text(
                          'Disconnect',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.accentRose,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
