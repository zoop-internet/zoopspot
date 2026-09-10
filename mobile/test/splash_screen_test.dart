import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:zoop_mobile/features/splash/presentation/screens/splash_screen.dart';

void main() {
  testWidgets('SplashScreen renders branding and navigates to dashboard', (
    tester,
  ) async {
    String navigatedRoute = '';

    final testRouter = GoRouter(
      initialLocation: '/splash',
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => SplashScreen(
            splashDuration: const Duration(milliseconds: 100),
            nextRoute: '/dashboard',
          ),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) {
            navigatedRoute = '/dashboard';
            return const Scaffold(body: Text('Dashboard Mock'));
          },
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: testRouter,
      ),
    );

    // Initial render: logo, branding text, and subtitle
    expect(find.text('ZOOP'), findsOneWidget);
    expect(find.text('Decentralized Internet Sharing'), findsOneWidget);

    // Advance past animation and splash timer
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pumpAndSettle();

    // Verify successful navigation to dashboard without onboarding
    expect(navigatedRoute, equals('/dashboard'));
    expect(find.text('Dashboard Mock'), findsOneWidget);
  });
}
