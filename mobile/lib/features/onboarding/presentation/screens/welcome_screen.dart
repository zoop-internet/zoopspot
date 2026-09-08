import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../../identity/presentation/widgets/recover_identity_sheet.dart';

class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _pages = [
    {
      'title': 'Your internet,\nyour rules.',
      'subtitle': 'Direct device-to-device encrypted connections. No middlemen, no surveillance.',
      'icon': Icons.shield_rounded,
    },
    {
      'title': 'No accounts.\nNo passwords.',
      'subtitle': 'Your cryptographic identity is generated on-device. Only you hold the keys.',
      'icon': Icons.fingerprint,
    },
    {
      'title': 'Share & earn\nbandwidth.',
      'subtitle': 'Share your connection with trusted peers and earn bandwidth credits automatically.',
      'icon': Icons.compare_arrows_rounded,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);

    return Scaffold(
      backgroundColor: ZoopColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              // Top Brand Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [ZoopColors.primaryCyan, ZoopColors.primaryCyanDark],
                          ),
                        ),
                        child: const Center(
                          child: Text(
                            'Z',
                            style: TextStyle(
                              color: Colors.black,
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'ZOOP',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              letterSpacing: 2,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                  ),
                  if (identityState.isRegistered)
                    TextButton.icon(
                      onPressed: () => context.go('/dashboard'),
                      icon: const Icon(Icons.dashboard_outlined, size: 18, color: ZoopColors.primaryCyan),
                      label: const Text('Dashboard', style: TextStyle(color: ZoopColors.primaryCyan)),
                    )
                  else
                    TextButton(
                      onPressed: () => context.go('/identity'),
                      child: const Text('Skip', style: TextStyle(color: ZoopColors.textMuted)),
                    ),
                ],
              ),
              const Spacer(),

              // Page View Slides
              SizedBox(
                height: 340,
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _pages.length,
                  onPageChanged: (idx) => setState(() => _currentPage = idx),
                  itemBuilder: (context, index) {
                    final p = _pages[index];
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            shape: BoxShape.circle,
                            border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                            boxShadow: [
                              BoxShadow(
                                color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                                blurRadius: 24,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: Icon(
                            p['icon'] as IconData,
                            size: 48,
                            color: ZoopColors.primaryCyan,
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          p['title'] as String,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                height: 1.2,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            p['subtitle'] as String,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: ZoopColors.textSecondary,
                                  height: 1.4,
                                ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

              // Page Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 28 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: _currentPage == index ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),

              const Spacer(),

              // Action Buttons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_currentPage < _pages.length - 1) {
                      _pageController.nextPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    } else {
                      if (identityState.isRegistered) {
                        context.go('/dashboard');
                      } else {
                        context.go('/identity');
                      }
                    }
                  },
                  child: Text(
                    _currentPage == _pages.length - 1
                        ? (identityState.isRegistered ? 'Open Zoop' : 'Create My Identity')
                        : 'Continue',
                  ),
                ),
              ),
              if (!identityState.isRegistered && _currentPage == _pages.length - 1) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => RecoverIdentitySheet.show(context),
                  child: const Text(
                    'I already have Zoop — Restore Identity',
                    style: TextStyle(color: ZoopColors.primaryCyan, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
