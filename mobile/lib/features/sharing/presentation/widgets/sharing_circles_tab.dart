import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';

/// Circles and Groups management tab widget.
class SharingCirclesTab extends StatelessWidget {
  final VoidCallback? onCreateGroup;

  const SharingCirclesTab({
    super.key,
    this.onCreateGroup,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: ZoopSpacing.screenPadding,
      physics: const BouncingScrollPhysics(),
      children: [
        // Trusted Circle Auto-Approval Banner
        Container(
          padding: ZoopSpacing.cardPadding,
          decoration: BoxDecoration(
            color: ZoopColors.surface,
            borderRadius: ZoopSpacing.radiusLg,
            border: Border.all(color: ZoopColors.surfaceBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                  borderRadius: ZoopSpacing.radiusMd,
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  color: ZoopColors.accentPurple,
                  size: 20,
                ),
              ),
              ZoopSpacing.gapMd,
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Auto-Approve Circle',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Peers in your circle connect automatically without prompts',
                      style: TextStyle(
                        fontSize: 11,
                        color: ZoopColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: true,
                activeThumbColor: ZoopColors.accentPurple,
                onChanged: (_) {},
              ),
            ],
          ),
        ),

        ZoopSpacing.gapLg,

        // Section header
        const Text(
          'YOUR GROUPS & CIRCLES',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: ZoopColors.textMuted,
          ),
        ),

        const SizedBox(height: 10),

        // Group 1: Close Friends
        _buildGroupTile(
          context: context,
          icon: Icons.people_alt_rounded,
          iconColor: ZoopColors.primaryCyan,
          name: 'Close Friends',
          subtitle: '4 devices • Always allowed to relay',
          memberCount: 4,
        ),

        const SizedBox(height: 10),

        // Group 2: Personal Fleet
        _buildGroupTile(
          context: context,
          icon: Icons.devices_other_rounded,
          iconColor: ZoopColors.accentGreen,
          name: 'My Personal Devices',
          subtitle: '3 devices • Zero-trust authenticated',
          memberCount: 3,
        ),

        const SizedBox(height: 10),

        // Group 3: Work / Team Org
        _buildGroupTile(
          context: context,
          icon: Icons.business_center_rounded,
          iconColor: ZoopColors.accentAmber,
          name: 'Zoop Engineering Org',
          subtitle: '12 devices • Corporate mesh policy',
          memberCount: 12,
        ),

        ZoopSpacing.gapLg,

        // Create New Circle / Group Action
        OutlinedButton.icon(
          onPressed: () {
            if (onCreateGroup != null) {
              onCreateGroup!();
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('New Circle creation dialog coming soon'),
                  duration: Duration(seconds: 2),
                ),
              );
            }
          },
          icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
          label: const Text('Create New Circle or Group'),
          style: OutlinedButton.styleFrom(
            foregroundColor: ZoopColors.primaryCyan,
            side: BorderSide(color: ZoopColors.primaryCyan.withValues(alpha: 0.4)),
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: ZoopSpacing.radiusMd,
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  Widget _buildGroupTile({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String name,
    required String subtitle,
    required int memberCount,
  }) {
    return Semantics(
      button: true,
      label: 'Circle: $name, $subtitle, $memberCount devices.',
      child: Material(
        color: ZoopColors.surface,
        borderRadius: ZoopSpacing.radiusLg,
        child: InkWell(
          borderRadius: ZoopSpacing.radiusLg,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('$name circle settings'),
                duration: const Duration(seconds: 1),
              ),
            );
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: iconColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: iconColor, size: 18),
                ),
                ZoopSpacing.gapMd,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
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
                          fontSize: 11,
                          color: ZoopColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
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
