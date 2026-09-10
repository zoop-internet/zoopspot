import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import '../theme/zoop_spacing.dart';
import '../theme/zoop_typography.dart';
import '../utils/zoop_feedback.dart';

enum ZoopButtonVariant {
  primary,
  secondary,
  outlined,
  destructive,
  ghost,
}

/// Canonical Zoop Button Component.
/// Adheres to Fitts's Law touch target minimums (>= 48x48 dp), provides
/// automatic tactile haptic feedback, loading state handling, and accessible semantics.
class ZoopButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final double height;
  final ZoopButtonVariant variant;
  final String? semanticsLabel;

  const ZoopButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.variant = ZoopButtonVariant.primary,
    this.semanticsLabel,
  });

  const ZoopButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.semanticsLabel,
  }) : variant = ZoopButtonVariant.primary;

  const ZoopButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.semanticsLabel,
  }) : variant = ZoopButtonVariant.secondary;

  const ZoopButton.outlined({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.semanticsLabel,
  }) : variant = ZoopButtonVariant.outlined;

  const ZoopButton.destructive({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.semanticsLabel,
  }) : variant = ZoopButtonVariant.destructive;

  const ZoopButton.ghost({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.height = 48.0,
    this.semanticsLabel,
  }) : variant = ZoopButtonVariant.ghost;

  bool get _isEnabled => onPressed != null && !isLoading;

  void _handleTap() {
    if (!_isEnabled) return;
    ZoopFeedback.selection();
    onPressed!();
  }

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color foregroundColor;
    BorderSide borderSide;

    switch (variant) {
      case ZoopButtonVariant.primary:
        backgroundColor = _isEnabled ? ZoopColors.primaryCyan : ZoopColors.surfaceElevated;
        foregroundColor = _isEnabled ? Colors.black : ZoopColors.textMuted;
        borderSide = BorderSide.none;
        break;
      case ZoopButtonVariant.secondary:
        backgroundColor = _isEnabled ? ZoopColors.surfaceElevated : ZoopColors.surface;
        foregroundColor = _isEnabled ? ZoopColors.primaryCyan : ZoopColors.textMuted;
        borderSide = BorderSide(
          color: _isEnabled
              ? ZoopColors.primaryCyan.withValues(alpha: 0.35)
              : ZoopColors.surfaceBorder,
        );
        break;
      case ZoopButtonVariant.outlined:
        backgroundColor = Colors.transparent;
        foregroundColor = _isEnabled ? ZoopColors.textPrimary : ZoopColors.textMuted;
        borderSide = BorderSide(
          color: _isEnabled ? ZoopColors.surfaceBorder : ZoopColors.surfaceBorder.withValues(alpha: 0.4),
        );
        break;
      case ZoopButtonVariant.destructive:
        backgroundColor = _isEnabled ? ZoopColors.accentRose : ZoopColors.surfaceElevated;
        foregroundColor = _isEnabled ? Colors.white : ZoopColors.textMuted;
        borderSide = BorderSide.none;
        break;
      case ZoopButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        foregroundColor = _isEnabled ? ZoopColors.primaryCyan : ZoopColors.textMuted;
        borderSide = BorderSide.none;
        break;
    }

    Widget content;
    if (isLoading) {
      content = Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2.2,
            valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
          ),
        ),
      );
    } else {
      content = Row(
        mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: foregroundColor),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Text(
              label,
              style: ZoopTypography.button.copyWith(
                color: foregroundColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }

    final buttonWidget = Material(
      color: backgroundColor,
      borderRadius: ZoopSpacing.radiusMd,
      child: InkWell(
        onTap: _isEnabled ? _handleTap : null,
        borderRadius: ZoopSpacing.radiusMd,
        child: Container(
          height: height,
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            borderRadius: ZoopSpacing.radiusMd,
            border: borderSide != BorderSide.none ? Border.fromBorderSide(borderSide) : null,
          ),
          child: Center(
            widthFactor: isFullWidth ? 1.0 : null,
            child: content,
          ),
        ),
      ),
    );

    return Semantics(
      button: true,
      enabled: _isEnabled,
      label: semanticsLabel ?? label,
      child: isFullWidth
          ? SizedBox(width: double.infinity, child: buttonWidget)
          : buttonWidget,
    );
  }
}
