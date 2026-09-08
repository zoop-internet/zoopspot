import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../domain/connection_models.dart';

class ConnectionSessionSheet extends StatelessWidget {
  final ActiveConnectionItem connection;
  final VoidCallback onDisconnect;

  const ConnectionSessionSheet({
    super.key,
    required this.connection,
    required this.onDisconnect,
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
                      color: connection.routeType.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: connection.routeType.color.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Icon(
                      connection.routeType.icon,
                      color: connection.routeType.color,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          connection.peerName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          connection.peerId,
                          style: const TextStyle(
                            fontSize: 12,
                            color: ZoopColors.primaryCyan,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: connection.routeType.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      connection.routeType.label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: connection.routeType.color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Session Health Metrics Grid
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
                        _buildMetricTile('Latency', '${connection.latencyMs} ms', Icons.speed, ZoopColors.accentGreen),
                        _buildMetricTile('Uptime', connection.formattedDuration, Icons.timer_outlined, ZoopColors.primaryCyan),
                      ],
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 20),
                    Row(
                      children: [
                        _buildMetricTile('Downloaded (Rx)', connection.formattedRx, Icons.download_rounded, ZoopColors.textPrimary),
                        _buildMetricTile('Uploaded (Tx)', connection.formattedTx, Icons.upload_rounded, ZoopColors.textPrimary),
                      ],
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 20),
                    Row(
                      children: [
                        _buildMetricTile('Quality Score', '${connection.qualityScore.toStringAsFixed(1)}%', Icons.verified_outlined, ZoopColors.accentGreen),
                        _buildMetricTile('Packet Loss', '${connection.packetLossPct.toStringAsFixed(1)}%', Icons.network_check, connection.packetLossPct > 1 ? ZoopColors.accentRose : ZoopColors.accentGreen),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // Cryptographic Architecture
              const Text(
                'CRYPTOGRAPHIC TUNNEL PARAMETERS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: ZoopColors.textMuted,
                ),
              ),
              const SizedBox(height: 10),
              _buildParameterRow('Tunnel Virtual IP', connection.tunnelIp),
              _buildParameterRow('Cipher Suite', connection.cipherSuite),
              _buildParameterRow('Key Exchange', 'Curve25519 (Ed25519)'),
              _buildParameterRow('Handshake Auth', 'Poly1305 MAC 128-bit'),
              _buildParameterRow('Keep-Alive Interval', '25 seconds'),
              const SizedBox(height: 24),
              // Disconnect button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    onDisconnect();
                  },
                  icon: const Icon(Icons.link_off, color: Colors.white),
                  label: const Text('DISCONNECT SESSION', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.accentRose,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
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
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
              ),
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

  Widget _buildParameterRow(String key, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(key, style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}
