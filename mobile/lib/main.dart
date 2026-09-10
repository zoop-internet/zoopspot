import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/zoop_theme.dart';
import 'core/vpn/vpn_bridge_service.dart';
import 'features/identity/application/identity_notifier.dart';
import 'features/wallet/application/wallet_notifier.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Native platform convention: edge-to-edge transparent system bars
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    const ProviderScope(
      child: ZoopApp(),
    ),
  );
}

class ZoopApp extends ConsumerStatefulWidget {
  const ZoopApp({super.key});

  @override
  ConsumerState<ZoopApp> createState() => _ZoopAppState();
}

class _ZoopAppState extends ConsumerState<ZoopApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-verify cloud connection status and rehydrate state on resume
      ref.read(identityNotifierProvider.notifier).verifyCloudConnection();
      ref.read(walletProvider.notifier).refreshBalance();
      ref.read(vpnBridgeServiceProvider).isTunnelRunning();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Zoop',
      debugShowCheckedModeBanner: false,
      theme: ZoopTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
