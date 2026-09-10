import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import '../theme/zoop_spacing.dart';
import '../theme/zoop_typography.dart';
import '../utils/zoop_feedback.dart';

/// Canonical Zoop Card Container.
/// Unifies surface backgrounds, subtle dark borders, standard padding, and tap ripples.
class ZoopCard extends StatelessWidget {
  final Widget? child;
  final String? title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;
  final bool isElevated;

  const ZoopCard({
    super.key,
    this.child,
    this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 1.0,
    this.padding,
    this.margin,
    this.borderRadius,
    this.isElevated = false,
  });

  const ZoopCard.elevated({
    super.key,
    this.child,
    this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 1.0,
    this.padding,
    this.margin,
    this.borderRadius,
  }) : isElevated = true;

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ??
        (isElevated ? ZoopColors.surfaceElevated : ZoopColors.surface);
    final border = borderColor ?? ZoopColors.surfaceBorder;
    final br = borderRadius ?? ZoopSpacing.radiusLg;
    final pad = padding ?? ZoopSpacing.cardPadding;

    Widget cardBody = Padding(
      padding: pad,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null || leading != null || trailing != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                if (leading != null) ...[
                  leading!,
                  const SizedBox(width: 12),
                ],
                if (title != null)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title!,
                          style: ZoopTypography.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle!,
                            style: ZoopTypography.bodySmall,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                if (trailing != null) ...[
                  const SizedBox(width: 8),
                  trailing!,
                ],
              ],
            ),
            if (child != null) const SizedBox(height: 14),
          ],
          ?child,
        ],
      ),
    );

    Widget container = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: br,
        border: Border.all(color: border, width: borderWidth),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: br,
        child: onTap != null
            ? InkWell(
                onTap: () {
                  ZoopFeedback.selection();
                  onTap!();
                },
                borderRadius: br,
                child: cardBody,
              )
            : cardBody,
      ),
    );

    if (onTap != null && title != null) {
      return Semantics(
        button: true,
        label: subtitle != null ? '$title. $subtitle' : title!,
        child: container,
      );
    }

    return container;
  }
}
