import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/theme/zoop_spacing.dart';
import 'package:zoop_mobile/core/theme/zoop_typography.dart';
import 'package:zoop_mobile/core/widgets/zoop_badge.dart';
import 'package:zoop_mobile/core/widgets/zoop_button.dart';
import 'package:zoop_mobile/core/widgets/zoop_card.dart';
import 'package:zoop_mobile/core/widgets/zoop_text_input.dart';
import 'package:zoop_mobile/features/activity/domain/activity_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ZoopSpacing Token Tests', () {
    test('spacing grid values are positive and monotonically increasing', () {
      expect(ZoopSpacing.xs, equals(4.0));
      expect(ZoopSpacing.sm, equals(8.0));
      expect(ZoopSpacing.md, equals(12.0));
      expect(ZoopSpacing.lg, equals(16.0));
      expect(ZoopSpacing.xl, equals(20.0));
      expect(ZoopSpacing.xxl, equals(24.0));
      expect(ZoopSpacing.xxxl, equals(32.0));
      expect(ZoopSpacing.huge, equals(48.0));

      expect(ZoopSpacing.xs < ZoopSpacing.sm, isTrue);
      expect(ZoopSpacing.sm < ZoopSpacing.md, isTrue);
      expect(ZoopSpacing.md < ZoopSpacing.lg, isTrue);
      expect(ZoopSpacing.lg < ZoopSpacing.xl, isTrue);
      expect(ZoopSpacing.xl < ZoopSpacing.xxl, isTrue);
      expect(ZoopSpacing.xxl < ZoopSpacing.xxxl, isTrue);
      expect(ZoopSpacing.xxxl < ZoopSpacing.huge, isTrue);
    });

    test('border radius presets have expected radii', () {
      expect(ZoopSpacing.radiusSm.topLeft.x, equals(8.0));
      expect(ZoopSpacing.radiusMd.topLeft.x, equals(12.0));
      expect(ZoopSpacing.radiusLg.topLeft.x, equals(16.0));
      expect(ZoopSpacing.radiusXl.topLeft.x, equals(20.0));
      expect(ZoopSpacing.radiusPill.topLeft.x, equals(999.0));
    });
  });

  group('ZoopTypography Token Tests', () {
    test('typography tokens provide valid TextStyles with expected font families', () {
      expect(ZoopTypography.hero.fontSize, equals(32.0));
      expect(ZoopTypography.h1.fontSize, equals(24.0));
      expect(ZoopTypography.h2.fontSize, equals(20.0));
      expect(ZoopTypography.h3.fontSize, equals(16.0));
      expect(ZoopTypography.title.fontSize, equals(14.0));
      expect(ZoopTypography.bodyLarge.fontSize, equals(15.0));
      expect(ZoopTypography.body.fontSize, equals(13.0));
      expect(ZoopTypography.bodySmall.fontSize, equals(11.0));
      expect(ZoopTypography.mono.fontSize, equals(12.0));
      expect(ZoopTypography.telemetry.fontSize, equals(14.0));

      // Font families check
      expect(ZoopTypography.mono.fontFamily, contains('JetBrainsMono'));
      expect(ZoopTypography.telemetry.fontFamily, contains('JetBrainsMono'));
    });
  });

  group('ZoopButton Component Tests', () {
    testWidgets('renders primary button and handles tap', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ZoopButton.primary(
                label: 'Connect Tunnel',
                icon: Icons.bolt,
                onPressed: () => pressed = true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Connect Tunnel'), findsOneWidget);
      expect(find.byIcon(Icons.bolt), findsOneWidget);

      await tester.tap(find.text('Connect Tunnel'));
      await tester.pumpAndSettle();

      expect(pressed, isTrue);
    });

    testWidgets('satisfies Fitts law touch target minimum of >= 48dp', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ZoopButton.secondary(
                label: 'Quick Action',
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      final buttonSize = tester.getSize(find.byType(ZoopButton));
      expect(buttonSize.height, greaterThanOrEqualTo(48.0));
      expect(buttonSize.width, greaterThanOrEqualTo(48.0));
    });

    testWidgets('renders loading state without firing onPressed', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ZoopButton.primary(
                label: 'Connecting...',
                isLoading: true,
                onPressed: () => pressed = true,
              ),
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Connecting...'), findsNothing);

      await tester.tap(find.byType(ZoopButton));
      await tester.pump();

      expect(pressed, isFalse);
    });

    testWidgets('renders destructive variant cleanly', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: ZoopButton.destructive(
                label: 'Disconnect',
                icon: Icons.power_settings_new,
                onPressed: () => pressed = true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('Disconnect'), findsOneWidget);
      expect(find.byIcon(Icons.power_settings_new), findsOneWidget);

      await tester.tap(find.text('Disconnect'));
      await tester.pumpAndSettle();

      expect(pressed, isTrue);
    });
  });

  group('ZoopCard Component Tests', () {
    testWidgets('renders card with title, subtitle, and child content', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ZoopCard(
              title: 'Mesh Status',
              subtitle: 'Encrypted WireGuard peer link',
              child: Text('Card Inner Body'),
            ),
          ),
        ),
      );

      expect(find.text('Mesh Status'), findsOneWidget);
      expect(find.text('Encrypted WireGuard peer link'), findsOneWidget);
      expect(find.text('Card Inner Body'), findsOneWidget);
    });

    testWidgets('fires onTap when card is tapped', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ZoopCard(
              title: 'Interactive Card',
              onTap: () => tapped = true,
              child: const Text('Tap Me'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Interactive Card'));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });
  });

  group('ZoopTextInput Component Tests', () {
    testWidgets('allows input and triggers onChanged and clear button', (tester) async {
      final controller = TextEditingController(text: 'Initial');
      String updatedText = '';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ZoopTextInput(
              controller: controller,
              labelText: 'Device Name',
              hintText: 'Enter name',
              onChanged: (val) => updatedText = val,
              onClear: () => controller.clear(),
            ),
          ),
        ),
      );

      expect(find.text('Initial'), findsOneWidget);
      expect(find.text('Device Name'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField), 'Updated Device');
      expect(updatedText, equals('Updated Device'));

      await tester.tap(find.byIcon(Icons.clear));
      await tester.pump();

      expect(controller.text, isEmpty);
    });

    testWidgets('displays error text when provided', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ZoopTextInput(
              labelText: 'Phone Number',
              errorText: 'Invalid Uganda MSISDN format',
            ),
          ),
        ),
      );

      expect(find.text('Invalid Uganda MSISDN format'), findsOneWidget);
    });
  });

  group('ZoopBadge Component Tests', () {
    testWidgets('renders online and offline badges with micro-icons', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Row(
              children: [
                ZoopBadge.online(),
                ZoopBadge.offline(),
                ZoopBadge.syncing(),
              ],
            ),
          ),
        ),
      );

      expect(find.text('ONLINE'), findsOneWidget);
      expect(find.text('OFFLINE'), findsOneWidget);
      expect(find.text('SYNCING'), findsOneWidget);

      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);
      expect(find.byIcon(Icons.remove_circle_outline), findsOneWidget);
      expect(find.byIcon(Icons.sync), findsOneWidget);
    });

    testWidgets('renders severity badges accurately', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Row(
              children: [
                ZoopBadge.severity(ActivitySeverity.warning),
                ZoopBadge.severity(ActivitySeverity.error),
              ],
            ),
          ),
        ),
      );

      expect(find.text('WARNING'), findsOneWidget);
      expect(find.text('CRITICAL'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
    });
  });
}
