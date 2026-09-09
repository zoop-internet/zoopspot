import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/zoop_colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/sharing')) return 1;
    if (location.startsWith('/fleet')) return 2;
    if (location.startsWith('/vault')) return 3;
    return 0; // default /dashboard
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/sharing');
        break;
      case 2:
        context.go('/fleet');
        break;
      case 3:
        context.go('/vault');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _calculateSelectedIndex(context);

    return Scaffold(
      backgroundColor: ZoopColors.background,
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: ZoopColors.surface,
          border: Border(
            top: BorderSide(
              color: ZoopColors.surfaceBorder,
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          top: false,
          child: NavigationBarTheme(
            data: NavigationBarThemeData(
              backgroundColor: ZoopColors.surface,
              indicatorColor: ZoopColors.primaryCyan.withValues(alpha: 0.18),
              labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>(
                (Set<WidgetState> states) {
                  if (states.contains(WidgetState.selected)) {
                    return const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.primaryCyan,
                    );
                  }
                  return const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: ZoopColors.textSecondary,
                  );
                },
              ),
              iconTheme: WidgetStateProperty.resolveWith<IconThemeData>(
                (Set<WidgetState> states) {
                  if (states.contains(WidgetState.selected)) {
                    return const IconThemeData(
                      color: ZoopColors.primaryCyan,
                      size: 22,
                    );
                  }
                  return const IconThemeData(
                    color: ZoopColors.textSecondary,
                    size: 22,
                  );
                },
              ),
            ),
            child: NavigationBar(
              selectedIndex: currentIndex,
              onDestinationSelected: (index) => _onItemTapped(index, context),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home_rounded),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.all_inclusive_rounded),
                  selectedIcon: Icon(Icons.all_inclusive_rounded),
                  label: 'Share',
                ),
                NavigationDestination(
                  icon: Icon(Icons.hub_outlined),
                  selectedIcon: Icon(Icons.hub_rounded),
                  label: 'Fleet',
                ),
                NavigationDestination(
                  icon: Icon(Icons.wallet_outlined),
                  selectedIcon: Icon(Icons.wallet_rounded),
                  label: 'Wallet',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
