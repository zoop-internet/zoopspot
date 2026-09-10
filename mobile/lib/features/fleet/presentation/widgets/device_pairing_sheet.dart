import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/zoop_colors.dart';

class DevicePairingSheet extends StatefulWidget {
  final String deviceName;
  final String deviceId;

  const DevicePairingSheet({
    super.key,
    required this.deviceName,
    required this.deviceId,
  });

  @override
  State<DevicePairingSheet> createState() => _DevicePairingSheetState();
}

class _DevicePairingSheetState extends State<DevicePairingSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _secondsRemaining = 300;
  Timer? _timer;
  String _pairingPin = '852914';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _secondsRemaining = 300);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
      }
    });
  }

  void _regeneratePin() {
    final nextPin = ((DateTime.now().millisecondsSinceEpoch ~/ 1000) % 900000 + 100000).toString();
    setState(() {
      _pairingPin = nextPin;
    });
    _startTimer();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('New 6-digit cryptographic PIN generated'),
        backgroundColor: ZoopColors.primaryCyan,
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  String _formatTimer(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        left: 20,
        right: 20,
        top: 16,
      ),
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: ZoopColors.surfaceBorder)),
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
          const SizedBox(height: 18),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.qr_code_scanner,
                    color: ZoopColors.primaryCyan, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pair New Device',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Link phone, laptop, or home gateway to your fleet',
                      style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Tab Bar
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              indicator: BoxDecoration(
                color: ZoopColors.primaryCyan.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.4)),
              ),
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textMuted,
              labelStyle:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.qr_code, size: 14),
                      SizedBox(width: 4),
                      Text('QR Code'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.terminal, size: 14),
                      SizedBox(width: 4),
                      Text('Terminal'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.pin, size: 14),
                      SizedBox(width: 4),
                      Text('Pair PIN'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Tab View
          SizedBox(
            height: 290,
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: QR Code
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 180,
                      height: 180,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: ZoopColors.primaryCyan.withValues(alpha: 0.2),
                            blurRadius: 16,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.qr_code_2, size: 116, color: Colors.black.withValues(alpha: 0.85)),
                          const SizedBox(height: 4),
                          Text(
                            widget.deviceId,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Scan this code with the Zoop app on your other device',
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),

                // Tab 2: Terminal / CLI
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Install and enroll Linux, Docker, or Raspberry Pi nodes:',
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: ZoopColors.background,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: ZoopColors.surfaceBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFFF5F56), shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFFFBD2E), shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF27C93F), shape: BoxShape.circle)),
                              const Spacer(),
                              const Text('bash', style: TextStyle(color: ZoopColors.textMuted, fontSize: 10, fontFamily: 'monospace')),
                            ],
                          ),
                          const SizedBox(height: 10),
                          SelectableText(
                            'curl -fsSL https://get.zoop.network | sh && zoop join --pin $_pairingPin',
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 11.5,
                              color: ZoopColors.primaryCyan,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(
                                text: 'curl -fsSL https://get.zoop.network | sh && zoop join --pin $_pairingPin'));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Terminal command copied to clipboard'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 14),
                          label: const Text('Copy Shell Command'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ZoopColors.primaryCyan,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Tab 3: Pairing PIN
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Enter this one-time code on your new device',
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    // 6 Digit Display
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(6, (idx) {
                        return Container(
                          width: 42,
                          height: 52,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: ZoopColors.primaryCyan.withValues(alpha: 0.5),
                              width: 1.5,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              _pairingPin.length > idx ? _pairingPin[idx] : '-',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: ZoopColors.primaryCyan,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 14),
                    // Expiry timer
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.timer_outlined,
                            size: 14, color: ZoopColors.accentAmber),
                        const SizedBox(width: 5),
                        Text(
                          'Expires in ${_formatTimer(_secondsRemaining)}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: ZoopColors.accentAmber,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Actions: Copy & Regenerate
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _pairingPin));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Pairing PIN copied to clipboard'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 14),
                          label: const Text('Copy PIN'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: ZoopColors.primaryCyan,
                            side: BorderSide(
                                color: ZoopColors.primaryCyan.withValues(alpha: 0.4)),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                          ),
                        ),
                        const SizedBox(width: 12),
                        TextButton.icon(
                          onPressed: _regeneratePin,
                          icon: const Icon(Icons.refresh, size: 14),
                          label: const Text('New PIN'),
                          style: TextButton.styleFrom(
                            foregroundColor: ZoopColors.textSecondary,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Security Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: ZoopColors.accentGreen.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.2)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline,
                    size: 14, color: ZoopColors.accentGreen),
                SizedBox(width: 6),
                Text(
                  'Direct Ed25519 End-to-End Cryptographic Peering',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: ZoopColors.accentGreen,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
