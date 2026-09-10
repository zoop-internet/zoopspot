import 'package:flutter/material.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/models/peer_device.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';

/// Device-to-Device P2P Connection Visualizer card displaying node states,
/// animated connection beams, and central mesh ring.
class MeshVisualizerCard extends StatelessWidget {
  final ConnectionStatus status;
  final PeerDevice? activePeer;
  final bool isConnected;
  final bool isConnecting;
  final AnimationController rotationController;
  final Animation<double> pulseAnimation;
  final VoidCallback onSelectPeer;

  const MeshVisualizerCard({
    super.key,
    required this.status,
    required this.activePeer,
    required this.isConnected,
    required this.isConnecting,
    required this.rotationController,
    required this.pulseAnimation,
    required this.onSelectPeer,
  });

  static IconData getPlatformIcon(String platform) {
    final p = platform.toLowerCase();
    if (p.contains('android')) return Icons.phone_android_rounded;
    if (p.contains('darwin') || p.contains('ios') || p.contains('mac')) {
      return Icons.laptop_mac_rounded;
    }
    if (p.contains('windows')) return Icons.desktop_windows_rounded;
    if (p.contains('router') || p.contains('openwrt')) {
      return Icons.router_rounded;
    }
    return Icons.dns_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = isConnected
        ? ZoopColors.accentGreen
        : (isConnecting ? ZoopColors.primaryCyan : ZoopColors.textMuted);

    return Semantics(
      container: true,
      label:
          'Connection visualizer: ${status.label}. ${isConnected && activePeer != null ? "Linked to ${activePeer!.name}" : ""}',
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 28.0, horizontal: 16.0),
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: ZoopSpacing.radiusXxl,
          border: Border.all(
            color: isConnected
                ? ZoopColors.accentGreen.withValues(alpha: 0.35)
                : ZoopColors.surfaceBorder,
            width: 1.2,
          ),
        ),
        child: Column(
          children: [
            // Device to Device P2P Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. Left: This Device
                _buildDeviceNode(
                  icon: Icons.phone_android_rounded,
                  name: 'This Phone',
                  isActive: true,
                  statusColor: isConnected
                      ? ZoopColors.accentGreen
                      : ZoopColors.primaryCyan,
                ),

                // 2. Animated Left-to-Center Line
                Expanded(
                  child: _buildConnectionBeam(
                    isActive: isConnected || isConnecting,
                    color: statusColor,
                  ),
                ),

                // 3. Center Rotating Mesh Ring
                _buildCenterMeshRing(context, statusColor),

                // 4. Animated Center-to-Right Line
                Expanded(
                  child: _buildConnectionBeam(
                    isActive: isConnected,
                    color: isConnected ? ZoopColors.accentGreen : ZoopColors.surfaceBorder,
                  ),
                ),

                // 5. Right: Target Peer Node (Tappable to Select)
                Semantics(
                  button: true,
                  label:
                      'Target peer node: ${activePeer?.name ?? "Select Node"}. Tap to change peer.',
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: onSelectPeer,
                    child: Container(
                      color: Colors.transparent,
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      child: _buildDeviceNode(
                        icon: activePeer != null
                            ? getPlatformIcon(activePeer!.platform)
                            : Icons.laptop_mac_rounded,
                        name: activePeer?.name ?? 'Select Node',
                        isActive: isConnected,
                        isTarget: true,
                        statusColor: isConnected
                            ? ZoopColors.accentGreen
                            : ZoopColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            ZoopSpacing.gapXl,

            // Simple Status Text
            Text(
              isConnected
                  ? 'Connected'
                  : (isConnecting ? 'Connecting...' : 'Not Connected'),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: statusColor,
                letterSpacing: 0.2,
              ),
            ),
            if (isConnected && activePeer != null) ...[
              const SizedBox(height: 4),
              Text(
                'Linked to ${activePeer!.name}',
                style: const TextStyle(
                  fontSize: 12,
                  color: ZoopColors.textSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceNode({
    required IconData icon,
    required String name,
    required bool isActive,
    required Color statusColor,
    bool isTarget = false,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isActive ? statusColor : ZoopColors.surfaceBorder,
                  width: 1.5,
                ),
              ),
              child: Icon(icon, color: statusColor, size: 24),
            ),
            if (isTarget)
              Container(
                padding: const EdgeInsets.all(3),
                decoration: const BoxDecoration(
                  color: ZoopColors.surface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.unfold_more,
                  size: 13,
                  color: ZoopColors.primaryCyan,
                ),
              ),
          ],
        ),
        ZoopSpacing.gapSm,
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 84, minWidth: 48),
          child: Text(
            name,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isActive ? ZoopColors.textPrimary : ZoopColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCenterMeshRing(BuildContext context, Color statusColor) {
    final disableAnimations = MediaQuery.maybeDisableAnimationsOf(context) ?? false;

    Widget buildRing({double glowAlpha = 0.25}) {
      return Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ZoopColors.surfaceElevated,
          border: Border.all(
            color: statusColor,
            width: 2.0,
          ),
          boxShadow: [
            BoxShadow(
              color: statusColor.withValues(alpha: glowAlpha),
              blurRadius: 16,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Icon(
          isConnected
              ? Icons.check_circle_rounded
              : (isConnecting ? Icons.sync : Icons.sensors),
          size: 22,
          color: statusColor,
        ),
      );
    }

    if (disableAnimations) {
      final staticGlow = isConnected ? 0.35 : (isConnecting ? 0.3 : 0.05);
      return RepaintBoundary(child: buildRing(glowAlpha: staticGlow));
    }

    return RepaintBoundary(
      child: RotationTransition(
        turns: isConnecting
            ? rotationController
            : const AlwaysStoppedAnimation(0),
        child: AnimatedBuilder(
          animation: pulseAnimation,
          builder: (context, child) {
            final glowAlpha = isConnected
                ? (0.2 + (pulseAnimation.value * 0.25))
                : (isConnecting ? 0.3 : 0.05);
            return buildRing(glowAlpha: glowAlpha);
          },
        ),
      ),
    );
  }

  Widget _buildConnectionBeam({
    required bool isActive,
    required Color color,
  }) {
    return RepaintBoundary(
      child: Container(
        height: 2.5,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(2),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: color.withValues(alpha: 0.4),
                    blurRadius: 4,
                  ),
                ]
              : null,
        ),
      ),
    );
  }
}
