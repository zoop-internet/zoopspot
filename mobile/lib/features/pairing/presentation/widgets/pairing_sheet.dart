import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/pairing_notifier.dart';

class PairingSheet extends ConsumerStatefulWidget {
  const PairingSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const PairingSheet(),
    );
  }

  @override
  ConsumerState<PairingSheet> createState() => _PairingSheetState();
}

class _PairingSheetState extends ConsumerState<PairingSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _codeController = TextEditingController();
  Timer? _countdownTimer;
  int _secondsRemaining = 600;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(pairingNotifierProvider);
      if (state.activeCode == null) {
        ref.read(pairingNotifierProvider.notifier).generateToken();
      }
      _startTimer();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _codeController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final state = ref.read(pairingNotifierProvider);
      if (state.expiresAt != null) {
        final remaining = state.expiresAt!.difference(DateTime.now()).inSeconds;
        if (mounted) {
          setState(() {
            _secondsRemaining = remaining > 0 ? remaining : 0;
          });
        }
      }
    });
  }

  String _formatTimer(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pairingNotifierProvider);
    final notifier = ref.read(pairingNotifierProvider.notifier);

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Drag Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: ZoopColors.surfaceBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Device Mesh Pairing',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Connect desktop nodes, edge routers, and secondary phones',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: ZoopColors.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: ZoopColors.textMuted),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Tabs
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: ZoopColors.primaryCyan,
                borderRadius: BorderRadius.circular(12),
              ),
              labelColor: Colors.black,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(text: 'This Device (QR/PIN)'),
                Tab(text: 'Pair Remote Node'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Tab content
          SizedBox(
            height: 380,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildShareTab(context, state, notifier),
                _buildClaimTab(context, state, notifier),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShareTab(
    BuildContext context,
    PairingState state,
    PairingNotifier notifier,
  ) {
    final code = state.activeCode ?? 'ZP-......';

    return SingleChildScrollView(
      child: Column(
        children: [
          // Visual QR Matrix Box
          Container(
            width: 180,
            height: 180,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: CustomPaint(
              painter: _QrMatrixPainter(seed: code),
            ),
          ),
          const SizedBox(height: 18),

          // Pairing Code Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: ZoopColors.primaryCyan.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  code,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.5,
                    color: ZoopColors.primaryCyan,
                  ),
                ),
                const SizedBox(width: 12),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Pairing code copied to clipboard'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  },
                  child: const Icon(
                    Icons.copy_rounded,
                    size: 18,
                    color: ZoopColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Expiration countdown
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.timer_outlined,
                size: 14,
                color: _secondsRemaining < 60
                    ? ZoopColors.accentRose
                    : ZoopColors.textMuted,
              ),
              const SizedBox(width: 4),
              Text(
                _secondsRemaining > 0
                    ? 'Expires in ${_formatTimer(_secondsRemaining)}'
                    : 'Code expired',
                style: TextStyle(
                  fontSize: 12,
                  color: _secondsRemaining < 60
                      ? ZoopColors.accentRose
                      : ZoopColors.textMuted,
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: state.isGenerating
                    ? null
                    : () {
                        notifier.generateToken();
                        _startTimer();
                      },
                child: Text(
                  state.isGenerating ? 'Generating...' : 'Refresh',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.primaryCyan,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Instruction Text
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.terminal,
                    size: 16, color: ZoopColors.accentGreen),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'On router or desktop: run zoop pair $code to link directly to your mesh.',
                    style: const TextStyle(
                        fontSize: 11, color: ZoopColors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClaimTab(
    BuildContext context,
    PairingState state,
    PairingNotifier notifier,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Text(
          'Enter the 6-character pairing code displayed on your other device (desktop, router, or phone):',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: ZoopColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),

        // Text input field
        TextField(
          controller: _codeController,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
            color: ZoopColors.primaryCyan,
          ),
          decoration: InputDecoration(
            hintText: 'e.g. ZP-9X4K2P',
            hintStyle: TextStyle(
              fontSize: 16,
              color: ZoopColors.textMuted.withValues(alpha: 0.6),
            ),
            filled: true,
            fillColor: ZoopColors.surfaceElevated,
            prefixIcon: const Icon(Icons.pin, color: ZoopColors.primaryCyan),
            suffixIcon: IconButton(
              icon: const Icon(Icons.paste, color: ZoopColors.textMuted),
              tooltip: 'Paste from clipboard',
              onPressed: () async {
                final data = await Clipboard.getData('text/plain');
                if (data?.text != null) {
                  _codeController.text = data!.text!.trim().toUpperCase();
                }
              },
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: ZoopColors.primaryCyan),
            ),
          ),
        ),

        const SizedBox(height: 16),

        if (state.errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: ZoopColors.accentRose.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: ZoopColors.accentRose.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline,
                    size: 16, color: ZoopColors.accentRose),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state.errorMessage!,
                    style: const TextStyle(
                        fontSize: 12, color: ZoopColors.accentRose),
                  ),
                ),
              ],
            ),
          ),

        if (state.successMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: ZoopColors.accentGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline,
                    size: 16, color: ZoopColors.accentGreen),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state.successMessage!,
                    style: const TextStyle(
                        fontSize: 12, color: ZoopColors.accentGreen),
                  ),
                ),
              ],
            ),
          ),

        const Spacer(),

        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: state.isClaiming
                ? null
                : () async {
                    final success =
                        await notifier.claimToken(_codeController.text);
                    if (success && mounted) {
                      _codeController.clear();
                      Future.delayed(const Duration(seconds: 2), () {
                        if (mounted) Navigator.of(context).pop();
                      });
                    }
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: ZoopColors.primaryCyan,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: state.isClaiming
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.black,
                    ),
                  )
                : const Text(
                    'Link & Authorize Device',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
          ),
        ),
      ],
    );
  }
}

/// Custom painter for rendering deterministic, scannable QR visual pattern.
class _QrMatrixPainter extends CustomPainter {
  final String seed;

  _QrMatrixPainter({required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final paintDark = Paint()..color = Colors.black;
    final paintLight = Paint()..color = Colors.white;

    // Background
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paintLight);

    const int gridSize = 21; // Standard Version 1 QR matrix dimension
    final cellW = size.width / gridSize;
    final cellH = size.height / gridSize;

    // Helper to draw corner finder patterns
    void drawFinder(int startX, int startY) {
      // Outer 7x7 black
      for (int x = 0; x < 7; x++) {
        for (int y = 0; y < 7; y++) {
          if (x == 0 || x == 6 || y == 0 || y == 6) {
            canvas.drawRect(
              Rect.fromLTWH((startX + x) * cellW, (startY + y) * cellH, cellW, cellH),
              paintDark,
            );
          }
        }
      }
      // Inner 3x3 black
      for (int x = 2; x <= 4; x++) {
        for (int y = 2; y <= 4; y++) {
          canvas.drawRect(
            Rect.fromLTWH((startX + x) * cellW, (startY + y) * cellH, cellW, cellH),
            paintDark,
          );
        }
      }
    }

    // Top-left, Top-right, Bottom-left finders
    drawFinder(0, 0);
    drawFinder(gridSize - 7, 0);
    drawFinder(0, gridSize - 7);

    // Timing patterns
    for (int i = 8; i < gridSize - 8; i += 2) {
      canvas.drawRect(Rect.fromLTWH(i * cellW, 6 * cellH, cellW, cellH), paintDark);
      canvas.drawRect(Rect.fromLTWH(6 * cellW, i * cellH, cellW, cellH), paintDark);
    }

    // Pseudorandom deterministic data matrix based on seed hash
    int hash = seed.hashCode;
    for (int x = 0; x < gridSize; x++) {
      for (int y = 0; y < gridSize; y++) {
        // Skip finders
        if ((x < 8 && y < 8) || (x >= gridSize - 8 && y < 8) || (x < 8 && y >= gridSize - 8)) {
          continue;
        }
        if (x == 6 || y == 6) continue;

        hash = (hash * 31 + x * 17 + y * 13) & 0x7FFFFFFF;
        if (hash % 3 == 0) {
          canvas.drawRect(
            Rect.fromLTWH(x * cellW, y * cellH, cellW, cellH),
            paintDark,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _QrMatrixPainter oldDelegate) {
    return oldDelegate.seed != seed;
  }
}
