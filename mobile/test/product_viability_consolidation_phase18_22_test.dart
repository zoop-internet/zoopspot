import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/widgets/zoop_button.dart';
import 'package:zoop_mobile/core/widgets/zoop_empty_state.dart';
import 'package:zoop_mobile/core/widgets/zoop_error_banner.dart';
import 'package:zoop_mobile/features/sharing/presentation/screens/sharing_screen.dart';
import 'package:zoop_mobile/features/wallet/presentation/widgets/add_funds_sheet.dart';
import 'package:zoop_mobile/features/wallet/presentation/widgets/withdraw_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Product Viability & Component Consolidation Tests (Phases 18-22)', () {
    testWidgets('AddFundsSheet renders canonical ZoopButton and explicit telecom fee disclosure', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: AddFundsSheet(
                onConfirm: ({required amount, required method, phoneNumber}) {},
              ),
            ),
          ),
        ),
      );

      expect(find.byType(AddFundsSheet), findsOneWidget);
      expect(find.text('Top-Up Zoop Wallet'), findsOneWidget);
      expect(find.byType(ZoopButton), findsOneWidget);
      expect(find.textContaining('REVIEW TOP-UP'), findsOneWidget);

      // Enter valid phone number for mobile money
      await tester.enterText(find.byType(TextField), '+256 772 123456');
      await tester.pump();

      // Scroll into view and tap to review
      await tester.ensureVisible(find.byType(ZoopButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ZoopButton));
      await tester.pumpAndSettle();

      // Check explicit fee disclosure
      expect(find.text('Confirm Top-Up'), findsOneWidget);
      expect(find.text('Telecom Network Fee'), findsOneWidget);
      expect(find.text('UGX 0 (Covered by Zoop)'), findsOneWidget);
      expect(find.textContaining('CONFIRM & PAY'), findsOneWidget);
    });

    testWidgets('WithdrawSheet calculates tiered telecom fees and net payout accurately', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: WithdrawSheet(
                availableAmount: 100000,
                onConfirm: ({required amount, required phoneNumber, required provider}) {},
              ),
            ),
          ),
        ),
      );

      expect(find.byType(WithdrawSheet), findsOneWidget);
      expect(find.text('Withdraw Provider Earnings'), findsOneWidget);
      expect(find.byType(ZoopButton), findsOneWidget);

      // Enter valid phone number
      await tester.enterText(find.byType(TextField), '+256 772 987654');
      await tester.pump();

      expect(find.textContaining('REVIEW WITHDRAWAL'), findsOneWidget);

      // Scroll into view and tap review button
      await tester.ensureVisible(find.byType(ZoopButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ZoopButton));
      await tester.pumpAndSettle();

      // For UGX 100,000 withdrawal, tier is UGX 50,001 - 150,000 -> UGX 1,200 fee
      expect(find.text('Confirm Withdrawal'), findsOneWidget);
      expect(find.text('Telecom Transfer Fee (Tiered)'), findsOneWidget);
      expect(find.text('UGX 1,200'), findsOneWidget);
      // Net payout = 100,000 - 1,200 = 98,800
      expect(find.text('UGX 98,800'), findsOneWidget);
    });

    testWidgets('SharingScreen provides educational mental model dialog', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: SharingScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Help icon exists in AppBar
      final helpFinder = find.byIcon(Icons.help_outline);
      expect(helpFinder, findsOneWidget);

      // Tap help icon
      await tester.tap(helpFinder, warnIfMissed: false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Verify educational clarity content
      expect(find.text('How Sharing Works'), findsOneWidget);
      expect(find.text('Sharing vs Connecting'), findsOneWidget);
      expect(find.text('Earn Zoop Points & UGX'), findsOneWidget);
      expect(find.text('Zero-Knowledge Privacy'), findsOneWidget);
      expect(find.text('Battery & Data Protections'), findsOneWidget);

      // Dismiss dialog
      await tester.tap(find.text('Got it'), warnIfMissed: false);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('How Sharing Works'), findsNothing);
    });

    testWidgets('ZoopEmptyState and ZoopErrorBanner integrate canonical ZoopButton', (tester) async {
      bool emptyActionFired = false;
      bool retryActionFired = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                ZoopEmptyState(
                  icon: Icons.wifi_off,
                  title: 'No Peers Found',
                  description: 'Scan nearby area to discover nodes.',
                  primaryActionLabel: 'Scan Area',
                  onPrimaryAction: () => emptyActionFired = true,
                ),
                ZoopErrorBanner(
                  message: 'Signaling connection failed.',
                  onRetry: () => retryActionFired = true,
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(ZoopButton), findsNWidgets(2));
      expect(find.text('Scan Area'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      await tester.tap(find.text('Scan Area'), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(emptyActionFired, isTrue);

      await tester.tap(find.text('Retry'), warnIfMissed: false);
      await tester.pumpAndSettle();
      expect(retryActionFired, isTrue);
    });
  });
}
