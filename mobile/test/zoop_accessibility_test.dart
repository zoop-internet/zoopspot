import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/theme/zoop_colors.dart';
import 'package:zoop_mobile/core/widgets/zoop_shimmer.dart';
import 'package:zoop_mobile/core/widgets/zoop_error_banner.dart';
import 'package:zoop_mobile/core/widgets/zoop_confirm_dialog.dart';
import 'package:zoop_mobile/features/activity/domain/activity_models.dart';
import 'package:zoop_mobile/features/wallet/domain/wallet_models.dart';
import 'package:zoop_mobile/features/wallet/presentation/widgets/payment_brand_icon.dart';

/// Relative luminance calculation per WCAG 2.1 standards.
double _relativeLuminance(Color c) {
  double channelLuminance(int channelValue) {
    final s = channelValue / 255.0;
    return (s <= 0.04045) ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4).toDouble();
  }

  final r = channelLuminance((c.r * 255).round());
  final g = channelLuminance((c.g * 255).round());
  final b = channelLuminance((c.b * 255).round());
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/// Contrast ratio between two colors per WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
double _contrastRatio(Color c1, Color c2) {
  final l1 = _relativeLuminance(c1);
  final l2 = _relativeLuminance(c2);
  final lighter = max(l1, l2);
  final darker = min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('WCAG 2.1 AA Contrast Ratio Tests', () {
    test('textPrimary meets AAA standard (> 7:1) on all dark surfaces', () {
      final ratioBackground = _contrastRatio(ZoopColors.textPrimary, ZoopColors.background);
      final ratioSurface = _contrastRatio(ZoopColors.textPrimary, ZoopColors.surface);
      final ratioElevated = _contrastRatio(ZoopColors.textPrimary, ZoopColors.surfaceElevated);

      expect(ratioBackground, greaterThanOrEqualTo(7.0),
          reason: 'textPrimary vs background contrast ($ratioBackground:1) must be >= 7:1');
      expect(ratioSurface, greaterThanOrEqualTo(7.0),
          reason: 'textPrimary vs surface contrast ($ratioSurface:1) must be >= 7:1');
      expect(ratioElevated, greaterThanOrEqualTo(7.0),
          reason: 'textPrimary vs surfaceElevated contrast ($ratioElevated:1) must be >= 7:1');
    });

    test('textSecondary meets AA standard (>= 4.5:1) on dark surfaces', () {
      final ratioBackground = _contrastRatio(ZoopColors.textSecondary, ZoopColors.background);
      final ratioSurface = _contrastRatio(ZoopColors.textSecondary, ZoopColors.surface);
      final ratioElevated = _contrastRatio(ZoopColors.textSecondary, ZoopColors.surfaceElevated);

      expect(ratioBackground, greaterThanOrEqualTo(4.5),
          reason: 'textSecondary vs background contrast ($ratioBackground:1) must be >= 4.5:1');
      expect(ratioSurface, greaterThanOrEqualTo(4.5),
          reason: 'textSecondary vs surface contrast ($ratioSurface:1) must be >= 4.5:1');
      expect(ratioElevated, greaterThanOrEqualTo(4.5),
          reason: 'textSecondary vs surfaceElevated contrast ($ratioElevated:1) must be >= 4.5:1');
    });

    test('textMuted meets AA standard (>= 4.5:1) on dark slate surfaces', () {
      final ratioBackground = _contrastRatio(ZoopColors.textMuted, ZoopColors.background);
      final ratioSurface = _contrastRatio(ZoopColors.textMuted, ZoopColors.surface);
      final ratioElevated = _contrastRatio(ZoopColors.textMuted, ZoopColors.surfaceElevated);

      expect(ratioBackground, greaterThanOrEqualTo(4.5),
          reason: 'textMuted vs background contrast ($ratioBackground:1) must be >= 4.5:1');
      expect(ratioSurface, greaterThanOrEqualTo(4.5),
          reason: 'textMuted vs surface contrast ($ratioSurface:1) must be >= 4.5:1');
      expect(ratioElevated, greaterThanOrEqualTo(4.5),
          reason: 'textMuted vs surfaceElevated contrast ($ratioElevated:1) must be >= 4.5:1');
    });

    test('Interactive accents and graphical elements meet >= 3:1 contrast', () {
      final cyanRatio = _contrastRatio(ZoopColors.primaryCyan, ZoopColors.surface);
      final greenRatio = _contrastRatio(ZoopColors.accentGreen, ZoopColors.surface);
      final disconnectedRatio = _contrastRatio(ZoopColors.disconnected, ZoopColors.surface);

      expect(cyanRatio, greaterThanOrEqualTo(3.0));
      expect(greenRatio, greaterThanOrEqualTo(3.0));
      expect(disconnectedRatio, greaterThanOrEqualTo(3.0));
    });
  });

  group('Color Independence & Dual Coding Tests', () {
    test('ActivitySeverity provides distinct geometric icons and text labels', () {
      for (final severity in ActivitySeverity.values) {
        expect(severity.label, isNotEmpty);
        expect(severity.icon, isNotNull);
      }
      // Ensure all 4 severities have distinct icons
      final icons = ActivitySeverity.values.map((s) => s.icon).toSet();
      expect(icons.length, equals(ActivitySeverity.values.length),
          reason: 'Each ActivitySeverity must have a distinct icon for color independence');
    });

    test('TransactionStatus provides distinct icons and color tokens', () {
      for (final status in TransactionStatus.values) {
        expect(status.icon, isNotNull);
        expect(status.color, isNotNull);
      }
      final icons = TransactionStatus.values.map((s) => s.icon).toSet();
      expect(icons.length, equals(TransactionStatus.values.length),
          reason: 'Each TransactionStatus must have a distinct icon');
    });
  });

  group('Reduced Motion Respect Tests', () {
    testWidgets('ZoopShimmer disables shader animation when disableAnimations is true', (tester) async {
      await tester.pumpWidget(
        const MediaQuery(
          data: MediaQueryData(disableAnimations: true),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: ZoopShimmer(
              child: Text('Loading Skeleton Item'),
            ),
          ),
        ),
      );
      await tester.pump();

      // When animations are disabled, ZoopShimmer returns child directly without ShaderMask
      expect(find.byType(ShaderMask), findsNothing);
      expect(find.text('Loading Skeleton Item'), findsOneWidget);
    });

    testWidgets('ZoopShimmer uses ShaderMask when animations are enabled', (tester) async {
      await tester.pumpWidget(
        const MediaQuery(
          data: MediaQueryData(disableAnimations: false),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: ZoopShimmer(
              child: Text('Loading Skeleton Item'),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(ShaderMask), findsOneWidget);
    });
  });

  group('Dynamic Text Scaling (200%) Layout Resilience Tests', () {
    testWidgets('ZoopErrorBanner scales to 200% font size without overflow', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(2.0),
              size: Size(360, 640),
            ),
            child: Scaffold(
              body: ZoopErrorBanner(
                title: 'High Latency Connection Warning',
                message: 'WireGuard tunnel ping has exceeded 400ms threshold.',
                onRetry: () {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('High Latency Connection Warning'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('PaymentBrandBadge renders cleanly under 200% text scaling in Wrap', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(
              textScaler: TextScaler.linear(2.0),
              size: Size(360, 640),
            ),
            child: Scaffold(
              body: Wrap(
                children: [
                  PaymentBrandBadge.mtn(),
                  PaymentBrandBadge.airtel(),
                  PaymentBrandBadge.card(),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('MTN Mobile Money'), findsOneWidget);
      expect(find.text('Airtel Money'), findsOneWidget);
      expect(find.text('Visa / Mastercard'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ZoopConfirmDialog renders cleanly at 200% text scale', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(2.0),
              size: Size(360, 640),
            ),
            child: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  ZoopConfirmDialog.show(
                    context: context,
                    title: 'Confirm Operation',
                    message: 'Do you want to proceed with terminating this WireGuard mesh tunnel?',
                    confirmLabel: 'Disconnect',
                    cancelLabel: 'Keep Active',
                    isDestructive: true,
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Operation'), findsOneWidget);
      expect(find.text('Disconnect'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
