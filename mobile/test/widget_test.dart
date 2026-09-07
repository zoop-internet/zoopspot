import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:zoop_mobile/main.dart';

void main() {
  testWidgets('ZoopApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: ZoopApp(),
      ),
    );
    expect(find.text('ZOOP'), findsOneWidget);
    expect(find.text('Decentralized P2P Mesh'), findsOneWidget);
  });
}
