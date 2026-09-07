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

  final List<Map<String, String>> _pages = [
    {
      'title': 'Decentralized P2P Mesh',
      'subtitle': 'Zoop connects your devices directly through NAT traversal and STUN/TURN signaling with zero centralized intermediary payload interception.',
      'icon': 'hub',
    },
    {
      'title': 'Zero-Knowledge Identity',
      'subtitle': 'No email, phone number, or password required. Your cryptographic identity is generated entirely on your local device.',
      'icon': 'lock',
    },
    {
      'title': 'Share & Connect Freely',
      'subtitle': 'Act as an egress provider for authorized devices, or connect to trusted peers across any cellular or Wi-Fi network.',
      'icon': 'share',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);

    return Scaffold(
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
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
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
                height: 320,
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
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            shape: BoxShape.circle,
                            border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                          ),
                          child: Icon(
                            p['icon'] == 'hub'
                                ? Icons.device_hub
                                : p['icon'] == 'lock'
                                    ? Icons.fingerprint
                                    : Icons.compare_arrows,
                            size: 40,
                            color: ZoopColors.primaryCyan,
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          p['title']!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          p['subtitle']!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
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
                  (index) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                      borderRadius: BorderRadius.circular(4),
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
                        ? (identityState.isRegistered ? 'Open Dashboard' : 'Get Started')
                        : 'Continue',
                  ),
                ),
              ),
              if (!identityState.isRegistered && _currentPage == _pages.length - 1) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => RecoverIdentitySheet.show(context),
                  child: const Text(
                    'I already have a Zoop ID (Recover)',
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
