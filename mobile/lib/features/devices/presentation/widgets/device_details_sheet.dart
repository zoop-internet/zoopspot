import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_confirm_dialog.dart';
import '../../domain/fleet_device_model.dart';

class DeviceDetailsSheet extends StatelessWidget {
  final FleetDeviceItem device;
  final ValueChanged<String> onRename;
  final VoidCallback onRevoke;
  final VoidCallback? onConnect;

  const DeviceDetailsSheet({
    super.key,
    required this.device,
    required this.onRename,
    required this.onRevoke,
    this.onConnect,
  });

  void _showRenameDialog(BuildContext context) {
    final controller = TextEditingController(text: device.name);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ZoopColors.surface,
        title: const Text('Rename Device', style: TextStyle(color: ZoopColors.textPrimary)),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: ZoopColors.textPrimary),
          decoration: const InputDecoration(
            hintText: 'Enter new device name',
            hintStyle: TextStyle(color: ZoopColors.textMuted),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: ZoopColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                ZoopFeedback.light();
                onRename(controller.text.trim());
              }
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ZoopColors.primaryCyan,
              foregroundColor: ZoopColors.background,
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRevoke(BuildContext context) async {
    final confirmed = await ZoopConfirmDialog.show(
      context: context,
      title: 'Revoke Node Access?',
      message: 'This will permanently disconnect "${device.name}" and revoke its WireGuard cryptographic keys from your Zoop network.',
      confirmLabel: 'Revoke Node',
      cancelLabel: 'Cancel',
      isDestructive: true,
      icon: Icons.delete_forever_rounded,
    );
    if (confirmed && context.mounted) {
      Navigator.of(context).pop();
      onRevoke();
    }
  }

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
                      color: device.isOnline
                          ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                          : ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: device.isOnline
                            ? ZoopColors.accentGreen.withValues(alpha: 0.3)
                            : ZoopColors.surfaceBorder,
                      ),
                    ),
                    child: Icon(
                      device.platformIcon,
                      color: device.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted,
                      size: 24,
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
                                device.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.textPrimary,
                                ),
                              ),
                            ),
                            if (device.isCurrentDevice) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: ZoopColors.primaryCyan.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'THIS DEVICE',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: ZoopColors.primaryCyan,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${device.platform} • ${device.role.label}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: ZoopColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    label: 'Rename device',
                    button: true,
                    child: IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20, color: ZoopColors.textSecondary),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      onPressed: () => _showRenameDialog(context),
                      tooltip: 'Rename Device',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Device Details Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ZoopColors.background,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    _buildRow('Status', device.isOnline ? 'Active & Online' : 'Offline / Inactive',
                        device.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Virtual IP', device.ipAddress, ZoopColors.textPrimary),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Endpoint ID', device.endpointId, ZoopColors.primaryCyan),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Public Key Fingerprint', device.publicKeyFingerprint, ZoopColors.textSecondary),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Connection Type', device.connectionType, ZoopColors.primaryCyan),
                    if (device.pingMs != null) ...[
                      const Divider(color: ZoopColors.surfaceBorder, height: 16),
                      _buildRow('Direct Ping Latency', '${device.pingMs} ms', ZoopColors.accentGreen),
                    ],
                    if (device.isExitNode && device.subnetRoute != null) ...[
                      const Divider(color: ZoopColors.surfaceBorder, height: 16),
                      _buildRow('Advertised Subnet', device.subnetRoute!, ZoopColors.accentPurple),
                    ],
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Daemon Version', device.version, ZoopColors.textSecondary),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              if (!device.isCurrentDevice) ...[
                if (onConnect != null) ...[
                  Semantics(
                    label: 'Connect to node ${device.name}',
                    button: true,
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          onConnect!();
                        },
                        icon: const Icon(Icons.bolt_rounded, color: Colors.black, size: 20),
                        label: const Text('CONNECT TO THIS NODE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.primaryCyan,
                          foregroundColor: Colors.black,
                          minimumSize: const Size.fromHeight(48),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Semantics(
                  label: 'Revoke and remove node ${device.name}',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmRevoke(context),
                      icon: const Icon(Icons.delete_forever, color: Colors.white, size: 18),
                      label: const Text('REVOKE & REMOVE NODE', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.accentRose,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(48),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String key, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(key, style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: valueColor, fontFamily: 'monospace'),
          ),
        ),
      ],
    );
  }
}
