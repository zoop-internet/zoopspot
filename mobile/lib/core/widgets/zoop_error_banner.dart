import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import 'zoop_button.dart';

/// Zoop Canonical Error Banner Component.
/// Displays inline errors, network connection drops, or API failures with
/// an actionable Retry mechanism and thumb-friendly recovery action.
class ZoopErrorBanner extends StatelessWidget {
  final String message;
  final String? title;
  final VoidCallback? onRetry;
  final VoidCallback? onDismiss;
  final EdgeInsetsGeometry margin;
  final bool isWarning;

  const ZoopErrorBanner({
    super.key,
    required this.message,
    this.title,
    this.onRetry,
    this.onDismiss,
    this.margin = const EdgeInsets.only(bottom: 16),
    this.isWarning = false,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = isWarning ? ZoopColors.accentAmber : ZoopColors.accentRose;

    return Container(
      margin: margin,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.35),
          width: 1.2,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isWarning ? Icons.warning_amber_rounded : Icons.error_outline_rounded,
              color: accentColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (title != null) ...[
                  Text(
                    title!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: accentColor,
                    ),
                  ),
                  const SizedBox(height: 2),
                ],
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 12,
                    color: ZoopColors.textPrimary,
                    height: 1.35,
                  ),
                ),
                if (onRetry != null) ...[
                  const SizedBox(height: 10),
                  ZoopButton.primary(
                    label: 'Retry',
                    icon: Icons.refresh,
                    height: 36,
                    onPressed: onRetry,
                  ),
                ],
              ],
            ),
          ),
          if (onDismiss != null)
            IconButton(
              icon: const Icon(Icons.close, size: 16, color: ZoopColors.textMuted),
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              padding: EdgeInsets.zero,
              onPressed: onDismiss,
            ),
        ],
      ),
    );
  }
}
