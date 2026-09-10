import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/utils/zoop_feedback.dart';
import 'package:zoop_mobile/core/widgets/zoop_confirm_dialog.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ZoopFeedback Tests', () {
    test('ZoopFeedback methods complete without errors', () async {
      await expectLater(ZoopFeedback.selection(), completes);
      await expectLater(ZoopFeedback.light(), completes);
      await expectLater(ZoopFeedback.medium(), completes);
      await expectLater(ZoopFeedback.heavy(), completes);
      await expectLater(ZoopFeedback.vibrate(), completes);
    });
  });

  group('ZoopConfirmDialog Widget Tests', () {
    testWidgets('renders title, message, and action buttons', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                ZoopConfirmDialog.show(
                  context: context,
                  title: 'Test Disconnect',
                  message: 'Are you sure you want to disconnect?',
                  confirmLabel: 'Disconnect',
                  cancelLabel: 'Keep',
                  isDestructive: true,
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Test Disconnect'), findsOneWidget);
      expect(find.text('Are you sure you want to disconnect?'), findsOneWidget);
      expect(find.text('Disconnect'), findsOneWidget);
      expect(find.text('Keep'), findsOneWidget);

      // Tap cancel
      await tester.tap(find.text('Keep'));
      await tester.pumpAndSettle();

      expect(find.text('Test Disconnect'), findsNothing);
    });

    testWidgets('confirm action returns true', (tester) async {
      bool? result;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                result = await ZoopConfirmDialog.show(
                  context: context,
                  title: 'Confirm Action',
                  message: 'Proceed with this operation?',
                  confirmLabel: 'Yes Proceed',
                  isDestructive: false,
                );
              },
              child: const Text('Trigger'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Trigger'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Action'), findsOneWidget);

      await tester.tap(find.text('Yes Proceed'));
      await tester.pumpAndSettle();

      expect(result, isTrue);
    });
  });
}
