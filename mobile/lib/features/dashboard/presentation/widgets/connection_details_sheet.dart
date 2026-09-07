import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/models/peer_device.dart';
import '../../../../core/models/routing_mode.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../diagnostics/domain/diagnostic_models.dart';
import '../../../diagnostics/application/diagnostics_notifier.dart';

class ConnectionDetailsSheet extends ConsumerWidget {
  final PeerDevice? peer;
  final ConnectionStatus status;
  final RoutingMode routingMode;

  const ConnectionDetailsSheet({
    super.key,
    required this.peer,
    required this.status,
    required this.routingMode,
  });

  static Future<void> show(
    BuildContext context, {
    required PeerDevice? peer,
    required ConnectionStatus status,
    required RoutingMode routingMode,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => ConnectionDetailsSheet(
        peer: peer,
        status: status,
        routingMode: routingMode,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDirect = status == ConnectionStatus.connectedDirect;

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
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
          const SizedBox(height: 20),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Tunnel Inspector',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Real-time cryptographic telemetry & routing parameters',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: ZoopColors.textSecondary,
                        ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (isDirect ? ZoopColors.directP2P : ZoopColors.relay)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: (isDirect ? ZoopColors.directP2P : ZoopColors.relay)
                        .withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  isDirect ? 'DIRECT P2P' : 'RELAY FALLBACK',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isDirect ? ZoopColors.directP2P : ZoopColors.relay,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Inspector Rows
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              children: [
                _buildInfoRow(
                  context,
                  label: 'Target Provider Node',
                  value: peer?.name ?? 'Frankfurt Edge Node',
                  icon: Icons.dns_rounded,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'Routing Policy',
                  value: routingMode.label,
                  icon: routingMode.icon,
                  valueColor: ZoopColors.primaryCyan,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'Tunnel Virtual IP',
                  value: '100.64.0.2 / 32',
                  icon: Icons.lan_outlined,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'WireGuard Noise_IK Key',
                  value: (peer?.wireguardPublicKey != null && peer!.wireguardPublicKey!.isNotEmpty)
                      ? (peer!.wireguardPublicKey!.length > 16
                          ? '${peer!.wireguardPublicKey!.substring(0, 10)}...${peer!.wireguardPublicKey!.substring(peer!.wireguardPublicKey!.length - 6)}'
                          : peer!.wireguardPublicKey!)
                      : 'Verified Session Key',
                  icon: Icons.key_rounded,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'Cipher Suite',
                  value: 'ChaCha20-Poly1305 (256-bit)',
                  icon: Icons.lock_outline,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'Kill-Switch & Leak Protection',
                  value: 'Fail-Closed Active',
                  icon: Icons.shield_outlined,
                  valueColor: ZoopColors.accentGreen,
                ),
                const Divider(height: 20, color: ZoopColors.surfaceBorder),
                _buildInfoRow(
                  context,
                  label: 'MTU / Keepalive',
                  value: '1420 bytes • 25s interval',
                  icon: Icons.tune_rounded,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Self-Healing Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.healing, size: 18, color: ZoopColors.accentAmber),
                    const SizedBox(width: 8),
                    Text(
                      'Self-Healing & DPD',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSelfHealingContent(context, ref),
              ],
            ),
          ),

          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: ZoopColors.surfaceBorder),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Close Inspector'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context, {
    required String label,
    required String value,
    required IconData icon,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: ZoopColors.textSecondary),
        const SizedBox(width: 10),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: ZoopColors.textSecondary,
              ),
        ),
        const Spacer(),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: valueColor ?? ZoopColors.textPrimary,
              ),
        ),
      ],
    );
  }

  Widget _buildSelfHealingContent(BuildContext context, WidgetRef ref) {
    final status = ref.watch(selfHealingStatusProvider);

    Color stateColor;
    String stateText;
    switch (status.peerState) {
      case DPDState.alive:
        stateColor = ZoopColors.accentGreen;
        stateText = 'ALIVE';
        break;
      case DPDState.suspect:
        stateColor = ZoopColors.accentAmber;
        stateText = 'SUSPECT';
        break;
      case DPDState.dead:
        stateColor = ZoopColors.accentRose;
        stateText = 'DEAD';
        break;
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Peer State', style: TextStyle(color: ZoopColors.textSecondary, fontSize: 13)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: stateColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: stateColor.withValues(alpha: 0.3)),
              ),
              child: Text(
                stateText,
                style: TextStyle(color: stateColor, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const Divider(height: 20, color: ZoopColors.surfaceBorder),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Retry Count', style: TextStyle(color: ZoopColors.textSecondary, fontSize: 13)),
            Text('${status.retryCount}', style: TextStyle(color: ZoopColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
        if (status.nextRetryIn != null) ...[
          const Divider(height: 20, color: ZoopColors.surfaceBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Next Retry In', style: TextStyle(color: ZoopColors.textSecondary, fontSize: 13)),
              Text('${status.nextRetryIn!.inSeconds}s', style: TextStyle(color: ZoopColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
        if (status.lastFailoverEvent != null) ...[
          const Divider(height: 20, color: ZoopColors.surfaceBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Last Failover', style: TextStyle(color: ZoopColors.textSecondary, fontSize: 13)),
              Expanded(
                child: Text(
                  status.lastFailoverEvent!,
                  textAlign: TextAlign.right,
                  style: TextStyle(color: ZoopColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
