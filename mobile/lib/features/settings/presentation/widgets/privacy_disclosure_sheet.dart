import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

class PrivacyDisclosureSheet extends StatelessWidget {
  const PrivacyDisclosureSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                children: [
                  Icon(Icons.privacy_tip_outlined, color: ZoopColors.accentGreen, size: 24),
                  SizedBox(width: 10),
                  Text(
                    'Zero-Knowledge Guarantee',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Zoop is engineered so that no entity—not other peers, relay operators, nor Zoop infrastructure—can inspect your private traffic.',
                style: TextStyle(fontSize: 13, color: ZoopColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 20),
              // What Zoop Handles
              _buildSection(
                title: 'WHAT ZOOP HANDLES (FOR ROUTING ONLY)',
                color: ZoopColors.primaryCyan,
                icon: Icons.check_circle_outline,
                items: [
                  'Cryptographic Ed25519 public keys for node verification',
                  'Encrypted WireGuard Noise handshake packets',
                  'Virtual mesh IP allocations (10.88.0.0/16)',
                  'Bandwidth and QoS telemetry (if enabled)',
                ],
              ),
              const SizedBox(height: 16),
              // What Zoop Never Touches
              _buildSection(
                title: 'WHAT ZOOP NEVER TOUCHES OR SEES',
                color: ZoopColors.accentGreen,
                icon: Icons.lock_outline,
                items: [
                  'Your private cryptographic seed phrase or private keys',
                  'Unencrypted IP payload or application traffic',
                  'Websites visited, URLs, or HTTP/HTTPS headers',
                  'DNS queries (routed via encrypted DoH resolver 1.1.1.1)',
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.primaryCyan,
                    foregroundColor: ZoopColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('I Understand', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required Color color,
    required IconData icon,
    required List<String> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ZoopColors.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(color: ZoopColors.textSecondary, fontWeight: FontWeight.bold)),
                  Expanded(
                    child: Text(
                      item,
                      style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
