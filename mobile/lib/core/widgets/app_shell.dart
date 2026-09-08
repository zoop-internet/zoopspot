import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/zoop_colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/connections')) return 1;
    if (location.startsWith('/sharing')) return 2;
    if (location.startsWith('/devices')) return 3;
    return 0; // default /dashboard
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/connections');
        break;
      case 2:
        context.go('/sharing');
        break;
      case 3:
        context.go('/devices');
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
              indicatorColor: ZoopColors.primaryCyan.withValues(alpha: 0.15),
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
                  icon: Icon(Icons.shield_outlined),
                  selectedIcon: Icon(Icons.shield),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.hub_outlined),
                  selectedIcon: Icon(Icons.hub),
                  label: 'Connections',
                ),
                NavigationDestination(
                  icon: Icon(Icons.wifi_tethering_outlined),
                  selectedIcon: Icon(Icons.wifi_tethering),
                  label: 'Sharing',
                ),
                NavigationDestination(
                  icon: Icon(Icons.devices_outlined),
                  selectedIcon: Icon(Icons.devices),
                  label: 'Devices',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
