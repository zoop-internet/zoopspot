import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../pairing/presentation/widgets/pairing_sheet.dart';
import '../../application/devices_notifier.dart';
import '../../domain/fleet_device_model.dart';
import '../widgets/device_details_sheet.dart';

class DevicesScreen extends ConsumerWidget {
  const DevicesScreen({super.key});

  void _showPairingSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const PairingSheet(),
    );
  }

  void _showDeviceSheet(BuildContext context, WidgetRef ref, FleetDeviceItem device) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DeviceDetailsSheet(
        device: device,
        onRename: (newName) {
          ref.read(devicesProvider.notifier).renameDevice(device.id, newName);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Device renamed to "$newName"'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
        },
        onRevoke: () {
          ref.read(devicesProvider.notifier).revokeDevice(device.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${device.name} removed from your fleet'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(devicesProvider);
    final notifier = ref.read(devicesProvider.notifier);

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.devices, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Devices & Fleet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: ZoopColors.textSecondary),
            tooltip: 'Refresh Nodes',
            onPressed: notifier.refreshDevices,
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: ZoopColors.primaryCyan,
          backgroundColor: ZoopColors.surface,
          onRefresh: () async {
            notifier.refreshDevices();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Fleet Header Card with Quick Pair
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.device_hub,
                          color: ZoopColors.primaryCyan,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${state.devices.length} Authorized Nodes',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: ZoopColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${state.onlineDevices.length} online, ${state.offlineDevices.length} standby',
                              style: const TextStyle(
                                fontSize: 12,
                                color: ZoopColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => _showPairingSheet(context),
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Pair Node', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.primaryCyan,
                          foregroundColor: ZoopColors.background,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Online Devices Section
                const Text(
                  'ONLINE NODES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: ZoopColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                ...state.onlineDevices.map((device) => _buildDeviceCard(context, ref, device)),

                if (state.offlineDevices.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text(
                    'OFFLINE / STANDBY NODES',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: ZoopColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...state.offlineDevices.map((device) => _buildDeviceCard(context, ref, device)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDeviceCard(BuildContext context, WidgetRef ref, FleetDeviceItem device) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showDeviceSheet(context, ref, device),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: ZoopColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        device.platformIcon,
                        color: device.isOnline ? ZoopColors.primaryCyan : ZoopColors.textMuted,
                        size: 22,
                      ),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: device.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted,
                        shape: BoxShape.circle,
                        border: Border.all(color: ZoopColors.surface, width: 2),
                      ),
                    ),
                  ],
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
                              device.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: ZoopColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (device.isCurrentDevice) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'THIS DEVICE',
                                style: TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.primaryCyan,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${device.ipAddress} • ${device.role.label}',
                        style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: Text(
                    device.publicKeyFingerprint,
                    style: const TextStyle(
                      fontSize: 10,
                      color: ZoopColors.textMuted,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right, size: 18, color: ZoopColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
