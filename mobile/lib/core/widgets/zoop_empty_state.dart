import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import 'zoop_button.dart';

/// Zoop Canonical Empty State Component.
/// Provides consistent, user-friendly empty state presentation across all features
/// with actionable recovery paths and thumb-zone compliant primary actions.
class ZoopEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color iconColor;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final IconData? primaryActionIcon;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final EdgeInsetsGeometry padding;
  final bool compact;

  const ZoopEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.iconColor = ZoopColors.primaryCyan,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.primaryActionIcon,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.padding = const EdgeInsets.all(24.0),
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
              border: Border.all(
                color: iconColor.withValues(alpha: 0.25),
                width: 1.5,
              ),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: compact ? 24 : 32,
            ),
          ),
          SizedBox(height: compact ? 12 : 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: compact ? 15 : 17,
              fontWeight: FontWeight.bold,
              color: ZoopColors.textPrimary,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                color: ZoopColors.textSecondary,
                height: 1.4,
              ),
            ),
          ),
          if (primaryActionLabel != null && onPrimaryAction != null) ...[
            SizedBox(height: compact ? 16 : 22),
            ZoopButton.primary(
              label: primaryActionLabel!,
              icon: primaryActionIcon ?? Icons.add,
              onPressed: onPrimaryAction,
            ),
          ],
          if (secondaryActionLabel != null && onSecondaryAction != null) ...[
            const SizedBox(height: 8),
            ZoopButton.ghost(
              label: secondaryActionLabel!,
              onPressed: onSecondaryAction,
            ),
          ],
        ],
      ),
    );
  }
}
