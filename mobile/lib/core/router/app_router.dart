import 'package:go_router/go_router.dart';
import '../widgets/app_shell.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/connections/presentation/screens/connections_screen.dart';
import '../../features/sharing/presentation/screens/sharing_screen.dart';
import '../../features/devices/presentation/screens/devices_screen.dart';
import '../../features/fleet/presentation/screens/fleet_screen.dart';
import '../../features/vault/presentation/screens/vault_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/identity/presentation/screens/identity_screen.dart';
import '../../features/onboarding/presentation/screens/welcome_screen.dart';
import '../../features/diagnostics/presentation/screens/diagnostics_screen.dart';
import '../../features/organizations/presentation/screens/organizations_screen.dart';
import '../../features/activity/presentation/screens/activity_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/dashboard',
  routes: [
    // Shell Route hosting the primary tabs
    ShellRoute(
      builder: (context, state, child) => AppShell(child: child),
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/connections',
          builder: (context, state) => const ConnectionsScreen(),
        ),
        GoRoute(
          path: '/sharing',
          builder: (context, state) => const SharingScreen(),
        ),
        GoRoute(
          path: '/devices',
          builder: (context, state) => const DevicesScreen(),
        ),
        GoRoute(
          path: '/fleet',
          builder: (context, state) => const FleetScreen(),
        ),
        GoRoute(
          path: '/wallet',
          builder: (context, state) => const WalletScreen(),
        ),
        GoRoute(
          path: '/vault',
          builder: (context, state) => const WalletScreen(),
        ),
      ],
    ),

    // Pushed Routes (overlays on top of the shell)
    GoRoute(
      path: '/',
      builder: (context, state) => const WelcomeScreen(),
    ),
    GoRoute(
      path: '/identity',
      builder: (context, state) => const IdentityScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/diagnostics',
      builder: (context, state) => const DiagnosticsScreen(),
    ),
    GoRoute(
      path: '/organizations',
      builder: (context, state) => const OrganizationsScreen(),
    ),
    GoRoute(
      path: '/activity',
      builder: (context, state) => const ActivityScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
  ],
);
