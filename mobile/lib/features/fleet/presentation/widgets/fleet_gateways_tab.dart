import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../devices/application/devices_notifier.dart';
import '../../../devices/domain/fleet_device_model.dart';

/// Tab widget for Gateways and Exit Nodes configuration and management.
class FleetGatewaysTab extends StatelessWidget {
  final DevicesState state;
  final Future<void> Function() onRefresh;
  final ValueChanged<String> onToggleExitNode;
  final ValueChanged<FleetDeviceItem> onShowDeviceSheet;
  final VoidCallback onDeployGateway;

  const FleetGatewaysTab({
    super.key,
    required this.state,
    required this.onRefresh,
    required this.onToggleExitNode,
    required this.onShowDeviceSheet,
    required this.onDeployGateway,
  });

  @override
  Widget build(BuildContext context) {
    final gateways = state.gateways;
    final activeExit = state.activeExitNode;

    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Exit Node Routing Status Banner
            Container(
              padding: ZoopSpacing.cardPadding,
              decoration: BoxDecoration(
                color: activeExit != null
                    ? ZoopColors.accentGreen.withValues(alpha: 0.1)
                    : ZoopColors.surface,
                borderRadius: ZoopSpacing.radiusLg,
                border: Border.all(
                  color: activeExit != null
                      ? ZoopColors.accentGreen.withValues(alpha: 0.4)
                      : ZoopColors.surfaceBorder,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: activeExit != null
                          ? ZoopColors.accentGreen.withValues(alpha: 0.2)
                          : ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      activeExit != null ? Icons.vpn_lock_rounded : Icons.alt_route_rounded,
                      color: activeExit != null ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeExit != null
                              ? 'Traffic Routed via ${activeExit.name}'
                              : 'Direct Egress (No Exit Node Active)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: activeExit != null
                                ? ZoopColors.accentGreen
                                : ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          activeExit != null
                              ? 'All internet traffic is securely tunneled through ${activeExit.ipAddress}. Your public IP appears as the gateway.'
                              : 'Traffic routes directly over local network interfaces. Select a gateway below to tunnel all outbound requests.',
                          style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary, height: 1.3),
                        ),
                        if (activeExit != null) ...[
                          const SizedBox(height: 10),
                          Semantics(
                            label: 'Disconnect exit route',
                            button: true,
                            child: OutlinedButton.icon(
                              onPressed: () => onToggleExitNode(activeExit.id),
                              icon: const Icon(Icons.power_settings_new, size: 16),
                              label: const Text('Disconnect Exit Route'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: ZoopColors.accentRose,
                                side: const BorderSide(color: ZoopColors.accentRose),
                                minimumSize: const Size(160, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            ZoopSpacing.gapXl,

            _buildSectionHeader('CONFIGURED GATEWAYS & EXITS (${gateways.length})', ZoopColors.primaryCyan),
            ZoopSpacing.gapSm,

            if (gateways.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: ZoopSpacing.radiusLg,
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.router_outlined, size: 48, color: ZoopColors.textMuted),
                    SizedBox(height: 12),
                    Text(
                      'No Exit Gateways Configured',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Pair a Linux server or router node to enable full-tunnel internet routing and subnet peering.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                    ),
                  ],
                ),
              )
            else
              ...gateways.map((gw) {
                final isActive = state.activeExitNodeId == gw.id;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: ZoopSpacing.cardPadding,
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: ZoopSpacing.radiusLg,
                    border: Border.all(
                      color: isActive
                          ? ZoopColors.accentGreen
                          : ZoopColors.surfaceBorder,
                      width: isActive ? 1.5 : 1.0,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                                  : ZoopColors.primaryCyan.withValues(alpha: 0.12),
                              borderRadius: ZoopSpacing.radiusMd,
                            ),
                            child: Icon(
                              Icons.dns_rounded,
                              color: isActive ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                              size: 22,
                            ),
                          ),
                          ZoopSpacing.gapMd,
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        gw.name,
                                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                                      ),
                                    ),
                                    if (isActive)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: ZoopColors.accentGreen.withValues(alpha: 0.2),
                                          borderRadius: ZoopSpacing.radiusSm,
                                        ),
                                        child: const Text(
                                          'ACTIVE ✓',
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: ZoopColors.accentGreen),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${gw.ipAddress} • ${gw.platform}',
                                  style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      ZoopSpacing.gapMd,
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: ZoopColors.surfaceElevated,
                          borderRadius: ZoopSpacing.radiusSm,
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.share_location, size: 14, color: ZoopColors.accentPurple),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Route: ${gw.subnetRoute ?? "0.0.0.0/0 (Default Gateway)"}',
                                style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: ZoopColors.textSecondary),
                              ),
                            ),
                            if (gw.pingMs != null) ...[
                              Text('⚡ ${gw.pingMs} ms', style: const TextStyle(fontSize: 11, color: ZoopColors.accentGreen, fontWeight: FontWeight.w600)),
                            ],
                          ],
                        ),
                      ),
                      ZoopSpacing.gapLg,
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Semantics(
                            label: 'View details for gateway node ${gw.name}',
                            button: true,
                            child: OutlinedButton(
                              onPressed: () => onShowDeviceSheet(gw),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: ZoopColors.textSecondary,
                                side: const BorderSide(color: ZoopColors.surfaceBorder),
                                minimumSize: const Size(96, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              child: const Text('Node Details'),
                            ),
                          ),
                          ZoopSpacing.gapSm,
                          Semantics(
                            label: isActive ? 'Exit route is currently active through ${gw.name}. Tap to disconnect' : 'Set ${gw.name} as active exit route',
                            button: true,
                            child: ElevatedButton.icon(
                              onPressed: () => onToggleExitNode(gw.id),
                              icon: Icon(isActive ? Icons.check : Icons.vpn_lock, size: 16),
                              label: Text(isActive ? 'Active Exit Node' : 'Use as Exit Node'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isActive ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                                foregroundColor: Colors.black,
                                minimumSize: const Size(140, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

            ZoopSpacing.gapLg,

            // Deploy New Gateway CTA
            Container(
              padding: ZoopSpacing.cardPadding,
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: ZoopSpacing.radiusLg,
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.terminal, color: ZoopColors.accentPurple, size: 22),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Deploy a Linux / Docker Gateway',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'One-liner CLI enrollment for cloud VPS or home router.',
                          style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    label: 'Deploy Linux or Docker gateway node',
                    button: true,
                    child: IconButton(
                      onPressed: onDeployGateway,
                      icon: const Icon(Icons.chevron_right, color: ZoopColors.primaryCyan),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      tooltip: 'Deploy Gateway',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: color,
        ),
      ),
    );
  }
}
