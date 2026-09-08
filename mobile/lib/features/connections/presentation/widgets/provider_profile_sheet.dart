import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../domain/connection_models.dart';

class ProviderProfileSheet extends StatelessWidget {
  final DiscoveredProvider provider;
  final VoidCallback onConnect;

  const ProviderProfileSheet({
    super.key,
    required this.provider,
    required this.onConnect,
  });

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
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: ZoopColors.primaryCyan.withValues(alpha: 0.3),
                      ),
                    ),
                    child: const Icon(
                      Icons.router_outlined,
                      color: ZoopColors.primaryCyan,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                provider.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.textPrimary,
                                ),
                              ),
                            ),
                            if (provider.isVerified) ...[
                              const SizedBox(width: 6),
                              const Icon(
                                Icons.verified,
                                color: ZoopColors.primaryCyan,
                                size: 16,
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${provider.location} • ${provider.zoopId}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: ZoopColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Provider Specs
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ZoopColors.background,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        _buildSpecTile('Trust Score', '${provider.trustScore}%', Icons.shield_outlined, ZoopColors.accentGreen),
                        _buildSpecTile('Latency', '${provider.latencyMs} ms', Icons.speed, ZoopColors.primaryCyan),
                      ],
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 20),
                    Row(
                      children: [
                        _buildSpecTile('Bandwidth Cap', '${provider.bandwidthCapacityMbps} Mbps', Icons.bolt, ZoopColors.accentAmber),
                        _buildSpecTile('Pricing Tier', provider.pricingType, Icons.payments_outlined, ZoopColors.textPrimary),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'SUPPORTED CAPABILITIES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: ZoopColors.textMuted,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: provider.routingCapabilities.map((cap) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: Text(
                      cap,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: ZoopColors.primaryCyan,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
              const Text(
                'WIREguard PUBLIC KEY',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: ZoopColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Text(
                  provider.publicKey,
                  style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: ZoopColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    onConnect();
                  },
                  icon: const Icon(Icons.flash_on, color: ZoopColors.background),
                  label: const Text(
                    'CONNECT VIA WIREGUARD P2P',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.primaryCyan,
                    foregroundColor: ZoopColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSpecTile(String label, String value, IconData icon, Color valueColor) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, size: 18, color: ZoopColors.textSecondary),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: valueColor),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
