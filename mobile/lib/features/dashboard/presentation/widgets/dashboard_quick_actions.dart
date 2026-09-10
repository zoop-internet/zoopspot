import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';

/// Ecosystem Quick Actions section displayed on the Dashboard.
class DashboardQuickActions extends StatelessWidget {
  final VoidCallback onShareBandwidth;
  final VoidCallback onPairDevice;
  final VoidCallback onDiagnostics;

  const DashboardQuickActions({
    super.key,
    required this.onShareBandwidth,
    required this.onPairDevice,
    required this.onDiagnostics,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: ZoopColors.textSecondary,
          ),
        ),
        ZoopSpacing.gapSm,
        _buildActionTile(
          context,
          icon: Icons.wifi_tethering,
          iconColor: ZoopColors.accentGreen,
          title: 'Share Bandwidth',
          subtitle: 'Provide access to trusted peers and earn credits',
          onTap: onShareBandwidth,
        ),
        ZoopSpacing.gapSm,
        _buildActionTile(
          context,
          icon: Icons.qr_code_scanner,
          iconColor: ZoopColors.primaryCyan,
          title: 'Pair New Device',
          subtitle: 'Link laptop, tablet, or gateway in seconds',
          onTap: onPairDevice,
        ),
        ZoopSpacing.gapSm,
        _buildActionTile(
          context,
          icon: Icons.health_and_safety_outlined,
          iconColor: ZoopColors.accentPurple,
          title: 'Diagnostics',
          subtitle: 'Check network health and NAT traversal',
          onTap: onDiagnostics,
        ),
      ],
    );
  }

  Widget _buildActionTile(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Semantics(
      button: true,
      label: '$title. $subtitle',
      child: Material(
        color: ZoopColors.surface,
        borderRadius: ZoopSpacing.radiusLg,
        child: InkWell(
          onTap: onTap,
          borderRadius: ZoopSpacing.radiusLg,
          child: Container(
            padding: const EdgeInsets.all(14.0),
            decoration: BoxDecoration(
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                ZoopSpacing.gapMd,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: ZoopColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: ZoopColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: ZoopColors.textMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
