import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';
import 'core/theme/zoop_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: ZoopApp(),
    ),
  );
}

class ZoopApp extends StatelessWidget {
  const ZoopApp({super.key});

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
