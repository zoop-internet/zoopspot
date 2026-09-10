import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';

/// Zoop Offline & Local Mesh Indicator Banner.
/// Displays when the device cannot reach the cloud control plane,
/// clarifying that encrypted peer-to-peer mesh networking remains active locally.
class ZoopOfflineBanner extends StatelessWidget {
  final VoidCallback? onReconnect;
  final bool isReconnecting;
  final EdgeInsetsGeometry margin;

  const ZoopOfflineBanner({
    super.key,
    this.onReconnect,
    this.isReconnecting = false,
    this.margin = const EdgeInsets.only(bottom: 14),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: ZoopColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: ZoopColors.accentAmber.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: ZoopColors.accentAmber.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.cloud_off_rounded,
              color: ZoopColors.accentAmber,
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Local Mesh Mode',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.accentAmber,
                  ),
                ),
                Text(
                  'Cloud offline. Direct P2P mesh tunnels remain active.',
                  style: TextStyle(
                    fontSize: 11,
                    color: ZoopColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (onReconnect != null) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: isReconnecting ? null : onReconnect,
              style: TextButton.styleFrom(
                foregroundColor: ZoopColors.primaryCyan,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                minimumSize: const Size(0, 32),
              ),
              child: isReconnecting
                  ? const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: ZoopColors.primaryCyan,
                      ),
                    )
                  : const Text(
                      'Retry',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
            ),
          ],
        ],
      ),
    );
  }
}
