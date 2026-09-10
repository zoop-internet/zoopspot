import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/widgets/zoop_confirm_dialog.dart';
import '../../domain/sharing_models.dart';

class RecipientDetailsSheet extends StatelessWidget {
  final ConnectedRecipientItem recipient;
  final VoidCallback onRevoke;
  final VoidCallback onBlock;

  const RecipientDetailsSheet({
    super.key,
    required this.recipient,
    required this.onRevoke,
    required this.onBlock,
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
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.3),
                      ),
                    ),
                    child: const Icon(
                      Icons.devices,
                      color: ZoopColors.accentGreen,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          recipient.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${recipient.peerZoopId} • ${recipient.platform}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: ZoopColors.primaryCyan,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Session Health Metrics
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
                        _buildMetricTile('Current Rate', recipient.formattedRate, Icons.speed, ZoopColors.accentGreen),
                        _buildMetricTile('Session Uptime', recipient.formattedDuration, Icons.timer_outlined, ZoopColors.primaryCyan),
                      ],
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 20),
                    Row(
                      children: [
                        _buildMetricTile('Total Relayed', recipient.formattedTransferred, Icons.data_usage, ZoopColors.textPrimary),
                        _buildMetricTile('Assigned IP', recipient.assignedVirtualIp, Icons.lan, ZoopColors.textSecondary),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'SECURITY CONTEXT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: ZoopColors.textMuted,
                ),
              ),
              const SizedBox(height: 10),
              _buildRow('Isolation Policy', 'Zero-Knowledge Tunneled (No LAN Access)'),
              _buildRow('Egress Route', 'Host Direct NAT (WireGuard)'),
              _buildRow('Traffic Inspection', 'None (Encrypted End-to-End)'),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final confirmed = await ZoopConfirmDialog.show(
                          context: context,
                          title: 'Block Recipient Node?',
                          message: 'Are you sure you want to block "${recipient.name}"? They will no longer be able to route traffic through your gateway.',
                          confirmLabel: 'Block Node',
                          cancelLabel: 'Cancel',
                          isDestructive: true,
                          icon: Icons.block,
                        );
                        if (confirmed && context.mounted) {
                          Navigator.of(context).pop();
                          onBlock();
                        }
                      },
                      icon: const Icon(Icons.block, size: 16, color: ZoopColors.accentRose),
                      label: const Text('Block Node', style: TextStyle(color: ZoopColors.accentRose, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: ZoopColors.accentRose),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final confirmed = await ZoopConfirmDialog.show(
                          context: context,
                          title: 'Disconnect Recipient?',
                          message: 'Disconnect the active sharing session for "${recipient.name}"?',
                          confirmLabel: 'Disconnect',
                          cancelLabel: 'Cancel',
                          isDestructive: true,
                          icon: Icons.link_off_rounded,
                        );
                        if (confirmed && context.mounted) {
                          Navigator.of(context).pop();
                          onRevoke();
                        }
                      },
                      icon: const Icon(Icons.close, size: 16, color: Colors.white),
                      label: const Text('Disconnect', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.surfaceElevated,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, IconData icon, Color valueColor) {
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

  Widget _buildRow(String key, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(key, style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
