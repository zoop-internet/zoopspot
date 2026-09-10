import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../application/sharing_notifier.dart';

/// Central interactive sharing hero component displaying the animated status orb
/// and active session credentials.
class SharingOrbHero extends StatelessWidget {
  final bool isSharing;
  final SharingState state;
  final VoidCallback onToggleSharing;
  final Animation<double> pulseAnimation;
  final AnimationController rotationController;
  final String? sessionPin;
  final String? inviteLink;
  final VoidCallback onShowQr;
  final ValueChanged<String>? onCopyLink;

  const SharingOrbHero({
    super.key,
    required this.isSharing,
    required this.state,
    required this.onToggleSharing,
    required this.pulseAnimation,
    required this.rotationController,
    this.sessionPin,
    this.inviteLink,
    required this.onShowQr,
    this.onCopyLink,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = isSharing ? ZoopColors.accentGreen : ZoopColors.textMuted;

    return Container(
      padding: ZoopSpacing.screenPadding,
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: ZoopSpacing.radiusXxl,
        border: Border.all(
          color: isSharing
              ? ZoopColors.accentGreen.withValues(alpha: 0.35)
              : ZoopColors.surfaceBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        children: [
          // Center Tap Animated Button
          Semantics(
            button: true,
            label: isSharing
                ? 'Sharing is active at ${state.currentEgressMbps.toStringAsFixed(1)} megabits per second with ${state.recipients.length} connected peers. Tap to stop sharing.'
                : 'Sharing is inactive. Tap to start sharing egress bandwidth.',
            child: GestureDetector(
              onTap: onToggleSharing,
              child: Builder(
                builder: (context) {
                  final disableAnimations =
                      MediaQuery.maybeDisableAnimationsOf(context) ?? false;

                  Widget buildOrb({
                    required double glowRadius,
                    required double glowAlpha,
                    required Widget iconWidget,
                  }) {
                    return Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: ZoopColors.surfaceElevated,
                        border: Border.all(
                          color: statusColor,
                          width: isSharing ? 2.5 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: statusColor.withValues(alpha: glowAlpha),
                            blurRadius: glowRadius,
                            spreadRadius: isSharing ? 4 : 0,
                          ),
                        ],
                      ),
                      child: Center(child: iconWidget),
                    );
                  }

                  final baseIcon = Icon(
                    isSharing
                        ? Icons.all_inclusive_rounded
                        : Icons.wifi_tethering_off_rounded,
                    color: statusColor,
                    size: 40,
                  );

                  if (disableAnimations) {
                    return buildOrb(
                      glowRadius: isSharing ? 22.0 : 4.0,
                      glowAlpha: isSharing ? 0.3 : 0.05,
                      iconWidget: baseIcon,
                    );
                  }

                  return AnimatedBuilder(
                    animation: pulseAnimation,
                    builder: (context, child) {
                      final glowRadius = isSharing
                          ? 18.0 + (pulseAnimation.value * 14.0)
                          : 4.0;
                      final glowAlpha = isSharing
                          ? (0.15 + (pulseAnimation.value * 0.25))
                          : 0.05;

                      return buildOrb(
                        glowRadius: glowRadius,
                        glowAlpha: glowAlpha,
                        iconWidget: RotationTransition(
                          turns: isSharing
                              ? rotationController
                              : const AlwaysStoppedAnimation(0),
                          child: baseIcon,
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),

          ZoopSpacing.gapMd,

          // Status & Tap Hint
          Text(
            isSharing ? 'SHARING ACTIVE' : 'TAP TO SHARE',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: statusColor,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            isSharing
                ? '${state.recipients.length} connected  •  ${state.currentEgressMbps.toStringAsFixed(1)} Mbps'
                : 'Tap the circle to open egress for friends',
            style: const TextStyle(
              fontSize: 12,
              color: ZoopColors.textSecondary,
            ),
          ),

          // Dynamic Credentials (shown when sharing is active)
          if (isSharing && sessionPin != null) ...[
            ZoopSpacing.gapLg,
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: ZoopSpacing.radiusLg,
                border: Border.all(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'PIN: ',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: ZoopColors.textMuted,
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            sessionPin!,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.0,
                              color: ZoopColors.accentGreen,
                            ),
                          ),
                        ],
                      ),
                      Semantics(
                        button: true,
                        label: 'Copy Session PIN $sessionPin',
                        child: IconButton(
                          icon: const Icon(Icons.copy, size: 18, color: ZoopColors.accentGreen),
                          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                          tooltip: 'Copy PIN',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: sessionPin!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Session PIN copied to clipboard'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  ZoopSpacing.gapSm,
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: onShowQr,
                          icon: const Icon(Icons.qr_code_2_rounded, size: 18),
                          label: const Text('Show QR'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ZoopColors.accentGreen,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            minimumSize: const Size(0, 44),
                            shape: RoundedRectangleBorder(
                              borderRadius: ZoopSpacing.radiusMd,
                            ),
                            textStyle: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                      ZoopSpacing.gapSm,
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (inviteLink != null) {
                              if (onCopyLink != null) {
                                onCopyLink!(inviteLink!);
                              } else {
                                Clipboard.setData(ClipboardData(text: inviteLink!));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Share link copied!'),
                                    backgroundColor: ZoopColors.accentGreen,
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              }
                            }
                          },
                          icon: const Icon(Icons.link_rounded, size: 18),
                          label: const Text('Copy Link'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: ZoopColors.textPrimary,
                            side: const BorderSide(color: ZoopColors.surfaceBorder),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            minimumSize: const Size(0, 44),
                            shape: RoundedRectangleBorder(
                              borderRadius: ZoopSpacing.radiusMd,
                            ),
                            textStyle: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
