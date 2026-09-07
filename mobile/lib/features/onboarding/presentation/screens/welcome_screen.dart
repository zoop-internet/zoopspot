import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _pages = [
    {
      'title': 'Decentralized P2P Mesh',
      'subtitle': 'Zoop connects your devices directly through NAT traversal and STUN/TURN signaling with zero centralized intermediary payload interception.',
      'icon': 'hub',
    },
    {
      'title': 'WireGuard Noise_IK Security',
      'subtitle': 'All peer tunnels are end-to-end encrypted with state-of-the-art Ed25519 authentication and ChaCha20-Poly1305 encryption.',
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
                  TextButton(
                    onPressed: () => context.go('/dashboard'),
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
                                    ? Icons.security
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
                      context.go('/identity');
                    }
                  },
                  child: Text(
                    _currentPage == _pages.length - 1 ? 'Get Started' : 'Continue',
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
