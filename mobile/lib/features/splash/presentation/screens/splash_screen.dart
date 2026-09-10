import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/zoop_colors.dart';

/// Modern, high-performance splash screen with 3D infinity logo entrance animation,
/// subtle ambient glow, and seamless auto-transition to the dashboard.
class SplashScreen extends StatefulWidget {
  final Duration splashDuration;
  final String nextRoute;

  const SplashScreen({
    super.key,
    this.splashDuration = const Duration(milliseconds: 1800),
    this.nextRoute = '/dashboard',
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _glowAnimation;
  Timer? _navigationTimer;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = Tween<double>(begin: 0.82, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.8, curve: Curves.easeOutCubic),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
      ),
    );

    _glowAnimation = Tween<double>(begin: 0.35, end: 0.75).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.2, 1.0, curve: Curves.easeInOut),
      ),
    );

    _animController.forward();

    // Schedule seamless transition to main screen
    _navigationTimer = Timer(widget.splashDuration, () {
      if (mounted) {
        context.go(widget.nextRoute);
      }
    });
  }

  @override
  void dispose() {
    _navigationTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ZoopColors.background,
      body: Stack(
        children: [
          // Subtle radial background atmosphere
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.1,
                  colors: [
                    ZoopColors.primaryCyan.withAlpha(25),
                    ZoopColors.background,
                  ],
                  stops: const [0.0, 0.8],
                ),
              ),
            ),
          ),

          // Centered branding & animated logo
          Center(
            child: AnimatedBuilder(
              animation: _animController,
              builder: (context, child) {
                return Opacity(
                  opacity: _fadeAnimation.value,
                  child: Transform.scale(
                    scale: _scaleAnimation.value,
                    child: child,
                  ),
                );
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated glowing backdrop behind the 3D infinity loop
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      AnimatedBuilder(
                        animation: _glowAnimation,
                        builder: (context, _) {
                          return Container(
                            width: 190,
                            height: 190,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  ZoopColors.primaryCyan.withValues(
                                    alpha: _glowAnimation.value * 0.45,
                                  ),
                                  ZoopColors.accentGreen.withValues(
                                    alpha: _glowAnimation.value * 0.25,
                                  ),
                                  Colors.transparent,
                                ],
                                stops: const [0.0, 0.5, 1.0],
                              ),
                            ),
                          );
                        },
                      ),

                      // Official Zoop 3D Infinity Ribbon Logo
                      Image.asset(
                        'assets/icons/zoop_logo.png',
                        width: 140,
                        height: 140,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          // Resilient fallback icon if asset loader is delayed
                          return const Icon(
                            Icons.all_inclusive_rounded,
                            size: 96,
                            color: ZoopColors.primaryCyan,
                          );
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // Brand name with premium tracking
                  Text(
                    'ZOOP',
                    style: GoogleFonts.inter(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 6.0,
                      color: ZoopColors.textPrimary,
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Subtitle & Positioning
                  Text(
                    'Decentralized Internet Sharing',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1.2,
                      color: ZoopColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom subtle activity indicator
          Positioned(
            left: 0,
            right: 0,
            bottom: 48,
            child: Center(
              child: SizedBox(
                width: 36,
                height: 3,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: const LinearProgressIndicator(
                    backgroundColor: Color(0xFF1F2937),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      ZoopColors.primaryCyan,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
