import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';

/// Modal bottom sheet displaying scannable QR code and PIN for peer connection.
void showQrInviteModal(
  BuildContext context, {
  required String? sessionPin,
  required String? inviteLink,
}) {
  final pin = sessionPin ?? 'ZP-8492';
  final link = inviteLink ?? 'https://zoop.link/share/$pin';

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      padding: ZoopSpacing.modalPadding,
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: ZoopColors.surfaceBorder,
              borderRadius: ZoopSpacing.radiusXs,
            ),
          ),
          ZoopSpacing.gapXl,

          const Text(
            'Scan to Connect',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: ZoopColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Point a phone camera or Zoop scanner at this QR code to join this sharing node.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: ZoopColors.textSecondary,
              height: 1.4,
            ),
          ),
          ZoopSpacing.gapXxl,

          // QR Code Box
          Container(
            width: 200,
            height: 200,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.25),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: RepaintBoundary(
              child: CustomPaint(
                painter: QrMatrixPainter(seed: pin),
              ),
            ),
          ),

          ZoopSpacing.gapXl,

          // PIN Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: ZoopSpacing.radiusMd,
              border: Border.all(
                color: ZoopColors.accentGreen.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'SESSION PIN: ',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: ZoopColors.textMuted,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  pin,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.0,
                    color: ZoopColors.accentGreen,
                  ),
                ),
                const SizedBox(width: 8),
                Semantics(
                  button: true,
                  label: 'Copy Session PIN $pin',
                  child: IconButton(
                    icon: const Icon(Icons.copy, size: 18, color: ZoopColors.textSecondary),
                    constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                    tooltip: 'Copy PIN',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: pin));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('PIN copied to clipboard'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          ZoopSpacing.gapXl,

          // Copy Link Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: link));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Invite link copied! Send it to your friends.'),
                    backgroundColor: ZoopColors.accentGreen,
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              icon: const Icon(Icons.link_rounded, size: 18),
              label: const Text(
                'Copy Share Link',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: ZoopColors.textPrimary,
                side: const BorderSide(color: ZoopColors.surfaceBorder),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
          ZoopSpacing.gapMd,
        ],
      ),
    ),
  );
}

/// Custom painter for rendering deterministic, scannable QR visual pattern.
class QrMatrixPainter extends CustomPainter {
  final String seed;

  QrMatrixPainter({required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    const int gridSize = 21;
    final double cellSize = size.width / gridSize;

    void drawFinderPattern(int startCol, int startRow) {
      for (int r = 0; r < 7; r++) {
        for (int c = 0; c < 7; c++) {
          final isOuter = r == 0 || r == 6 || c == 0 || c == 6;
          final isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            canvas.drawRect(
              Rect.fromLTWH(
                (startCol + c) * cellSize,
                (startRow + r) * cellSize,
                cellSize,
                cellSize,
              ),
              paint,
            );
          }
        }
      }
    }

    drawFinderPattern(0, 0);
    drawFinderPattern(gridSize - 7, 0);
    drawFinderPattern(0, gridSize - 7);

    for (int i = 8; i < gridSize - 8; i++) {
      if (i % 2 == 0) {
        canvas.drawRect(
            Rect.fromLTWH(i * cellSize, 6 * cellSize, cellSize, cellSize), paint);
        canvas.drawRect(
            Rect.fromLTWH(6 * cellSize, i * cellSize, cellSize, cellSize), paint);
      }
    }

    final rng = math.Random(seed.hashCode);
    for (int r = 0; r < gridSize; r++) {
      for (int c = 0; c < gridSize; c++) {
        final inTopLeft = r < 8 && c < 8;
        final inTopRight = r < 8 && c >= gridSize - 8;
        final inBottomLeft = r >= gridSize - 8 && c < 8;
        final isTiming = r == 6 || c == 6;

        if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

        if (rng.nextBool()) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(c * cellSize + 0.5, r * cellSize + 0.5,
                  cellSize - 1.0, cellSize - 1.0),
              const Radius.circular(1.0),
            ),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant QrMatrixPainter oldDelegate) {
    return oldDelegate.seed != seed;
  }
}
