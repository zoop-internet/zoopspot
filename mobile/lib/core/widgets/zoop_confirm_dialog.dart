import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import '../utils/zoop_feedback.dart';

/// Reusable, accessible confirmation dialog for high-impact and destructive actions.
/// Designed according to Nielsen Heuristic #5 (Error Prevention) & Fitts's Law.
class ZoopConfirmDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final bool isDestructive;
  final IconData? icon;

  const ZoopConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    this.confirmLabel = 'Confirm',
    this.cancelLabel = 'Cancel',
    this.isDestructive = false,
    this.icon,
  });

  /// Displays the confirmation dialog and returns true if confirmed.
  static Future<bool> show({
    required BuildContext context,
    required String title,
    required String message,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool isDestructive = false,
    IconData? icon,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => ZoopConfirmDialog(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        isDestructive: isDestructive,
        icon: icon ?? (isDestructive ? Icons.warning_amber_rounded : Icons.help_outline_rounded),
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = isDestructive ? ZoopColors.accentRose : ZoopColors.primaryCyan;

    return AlertDialog(
      backgroundColor: ZoopColors.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isDestructive
              ? ZoopColors.accentRose.withValues(alpha: 0.3)
              : ZoopColors.surfaceBorder,
        ),
      ),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      contentPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      title: Row(
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: primaryColor, size: 20),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
      content: Text(
        message,
        style: const TextStyle(
          fontSize: 13,
          color: ZoopColors.textSecondary,
          height: 1.45,
        ),
      ),
      actions: [
        Semantics(
          label: cancelLabel,
          button: true,
          child: TextButton(
            onPressed: () {
              ZoopFeedback.selection();
              Navigator.of(context).pop(false);
            },
            style: TextButton.styleFrom(
              foregroundColor: ZoopColors.textSecondary,
              minimumSize: const Size(80, 48),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            child: Text(cancelLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
        Semantics(
          label: confirmLabel,
          button: true,
          child: ElevatedButton(
            onPressed: () {
              if (isDestructive) {
                ZoopFeedback.heavy();
              } else {
                ZoopFeedback.medium();
              }
              Navigator.of(context).pop(true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryColor,
              foregroundColor: isDestructive ? Colors.white : Colors.black,
              elevation: 0,
              minimumSize: const Size(100, 48),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}
