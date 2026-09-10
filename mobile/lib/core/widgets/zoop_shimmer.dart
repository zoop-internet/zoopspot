import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';

/// Zoop Shimmer and Skeleton Loading Components.
/// Provides smooth pulsating skeleton loading states adhering to the dark slate palette.
/// Fully accessible and automatically disables animations when the user has enabled
/// reduced motion preferences.
class ZoopShimmer extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Color baseColor;
  final Color highlightColor;

  const ZoopShimmer({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 1500),
    this.baseColor = ZoopColors.surface,
    this.highlightColor = ZoopColors.surfaceElevated,
  });

  @override
  State<ZoopShimmer> createState() => _ZoopShimmerState();
}

class _ZoopShimmerState extends State<ZoopShimmer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Respect system-wide reduced motion accessibility settings
    final disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (disableAnimations) {
      return widget.child;
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final value = _controller.value;
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                widget.baseColor,
                widget.highlightColor,
                widget.baseColor,
              ],
              stops: [
                (value - 0.4).clamp(0.0, 1.0),
                value.clamp(0.0, 1.0),
                (value + 0.4).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// A placeholder line block with rounded corners.
class ZoopSkeletonLine extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;
  final Color? color;

  const ZoopSkeletonLine({
    super.key,
    this.width = double.infinity,
    this.height = 14,
    this.borderRadius = 6,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? ZoopColors.surfaceElevated,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// A placeholder skeleton card simulating balance/metrics cards.
class ZoopSkeletonCard extends StatelessWidget {
  final double height;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const ZoopSkeletonCard({
    super.key,
    this.height = 140,
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(20),
  });

  @override
  Widget build(BuildContext context) {
    return ZoopShimmer(
      child: Container(
        height: height,
        width: double.infinity,
        padding: padding,
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(color: ZoopColors.surfaceBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const ZoopSkeletonLine(width: 120, height: 14),
                ZoopSkeletonLine(
                  width: 54,
                  height: 18,
                  borderRadius: 8,
                  color: ZoopColors.surfaceElevated.withValues(alpha: 0.8),
                ),
              ],
            ),
            const ZoopSkeletonLine(width: 200, height: 32, borderRadius: 8),
            const ZoopSkeletonLine(width: double.infinity, height: 44, borderRadius: 12),
          ],
        ),
      ),
    );
  }
}

/// A placeholder skeleton list tile for peer, connection, or transaction lists.
class ZoopSkeletonListTile extends StatelessWidget {
  final bool hasLeadingCircle;
  final double height;

  const ZoopSkeletonListTile({
    super.key,
    this.hasLeadingCircle = true,
    this.height = 68,
  });

  @override
  Widget build(BuildContext context) {
    return ZoopShimmer(
      child: Container(
        height: height,
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ZoopColors.surfaceBorder),
        ),
        child: Row(
          children: [
            if (hasLeadingCircle) ...[
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
            ],
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ZoopSkeletonLine(width: 140, height: 14),
                  SizedBox(height: 6),
                  ZoopSkeletonLine(width: 90, height: 10),
                ],
              ),
            ),
            const ZoopSkeletonLine(width: 48, height: 18, borderRadius: 6),
          ],
        ),
      ),
    );
  }
}
