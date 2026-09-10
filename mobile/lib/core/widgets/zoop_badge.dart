import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import '../../features/activity/domain/activity_models.dart';

/// Canonical Zoop Dual-Coded Status Badge Component.
/// Conveys status through both geometric micro-icons and high-contrast text.
class ZoopBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final VoidCallback? onTap;

  const ZoopBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.onTap,
  });

  const ZoopBadge.online({
    super.key,
    this.label = 'ONLINE',
    this.onTap,
  })  : color = ZoopColors.accentGreen,
        icon = Icons.check_circle_outline;

  const ZoopBadge.offline({
    super.key,
    this.label = 'OFFLINE',
    this.onTap,
  })  : color = ZoopColors.textMuted,
        icon = Icons.remove_circle_outline;

  const ZoopBadge.syncing({
    super.key,
    this.label = 'SYNCING',
    this.onTap,
  })  : color = ZoopColors.accentAmber,
        icon = Icons.sync;

  factory ZoopBadge.severity(ActivitySeverity severity, {VoidCallback? onTap}) {
    return ZoopBadge(
      label: severity.label.toUpperCase(),
      color: severity.color,
      icon: severity.icon,
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget badge = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: color.withValues(alpha: 0.35),
          width: 1.0,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      badge = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: badge,
      );
    }

    return Semantics(
      label: 'Status badge: $label',
      child: badge,
    );
  }
}
