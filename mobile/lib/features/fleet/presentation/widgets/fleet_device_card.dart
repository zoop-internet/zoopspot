import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../devices/domain/fleet_device_model.dart';

/// Device card item within Fleet mesh list.
class FleetDeviceCard extends StatelessWidget {
  final FleetDeviceItem dev;
  final VoidCallback onTap;

  const FleetDeviceCard({
    super.key,
    required this.dev,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final statusText = dev.isOnline ? 'online' : 'standby';
    final identityText = dev.isCurrentDevice ? ', this device' : '';
    final exitText = dev.isExitNode ? ', exit gateway' : '';
    final semanticsLabel =
        '${dev.name}$identityText, $statusText$exitText, IP ${dev.ipAddress}, platform ${dev.platform}, role ${dev.role.label}. Tap to open node details.';

    return Semantics(
      label: semanticsLabel,
      button: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ZoopColors.surfaceBorder),
        ),
        child: ListTile(
          onTap: onTap,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: dev.isOnline
                      ? ZoopColors.primaryCyan.withValues(alpha: 0.15)
                      : ZoopColors.surfaceElevated,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  dev.platformIcon,
                  color: dev.isOnline ? ZoopColors.primaryCyan : ZoopColors.textMuted,
                  size: 20,
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: dev.isOnline ? ZoopColors.accentGreen : ZoopColors.surfaceBorder,
                    border: Border.all(color: ZoopColors.surface, width: 1.5),
                  ),
                  child: Center(
                    child: Icon(
                      dev.isOnline ? Icons.check : Icons.remove,
                      size: 8,
                      color: dev.isOnline ? Colors.black : ZoopColors.textMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
          title: Row(
            children: [
              Flexible(
                child: Text(
                  dev.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (dev.isCurrentDevice) ...[
                ZoopSpacing.gapSm,
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'THIS DEVICE',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: ZoopColors.accentGreen),
                  ),
                ),
              ],
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 3),
              Text(
                '${dev.ipAddress} • ${dev.platform} • ${dev.role.label}',
                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (dev.pingMs != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('⚡ ', style: TextStyle(fontSize: 10)),
                          Text(
                            '${dev.pingMs} ms',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: (dev.pingMs! < 25) ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                            ),
                          ),
                        ],
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      dev.connectionType,
                      style: const TextStyle(fontSize: 10, color: ZoopColors.primaryCyan, fontWeight: FontWeight.w500),
                    ),
                  ),
                  if (dev.isExitNode)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Exit Gateway',
                        style: TextStyle(fontSize: 10, color: ZoopColors.accentPurple, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
            ],
          ),
          trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
        ),
      ),
    );
  }
}
