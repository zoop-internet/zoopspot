import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/provider_notifier.dart';
import '../../domain/provider_settings.dart';

class GatewaySettingsSheet extends ConsumerWidget {
  const GatewaySettingsSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const GatewaySettingsSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(providerNotifierProvider);
    final notifier = ref.read(providerNotifierProvider.notifier);

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
          // Handle
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

          // Title
          Text(
            'Gateway Policies & Safeguards',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Control who can route through this device and protect battery / cellular data.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: ZoopColors.textSecondary,
                ),
          ),
          const SizedBox(height: 24),

          // Section 1: Sharing Boundary
          Text(
            'SHARING BOUNDARY',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  color: ZoopColors.accentPurple,
                ),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: RadioGroup<SharingScope>(
              groupValue: settings.sharingScope,
              onChanged: (newScope) {
                if (newScope != null) {
                  notifier.updateSharingScope(newScope);
                }
              },
              child: Column(
                children: SharingScope.values.map((scope) {
                  final isSelected = settings.sharingScope == scope;
                  return RadioListTile<SharingScope>(
                    value: scope,
                    activeColor: ZoopColors.accentPurple,
                    title: Text(
                      scope.label,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? ZoopColors.textPrimary : ZoopColors.textSecondary,
                      ),
                    ),
                    subtitle: Text(
                      scope.description,
                      style: const TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Section 2: Automated Resource Safeguards
          Text(
            'AUTOMATED SAFEGUARDS',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 1.2,
                  color: ZoopColors.accentGreen,
                ),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  value: settings.pauseOnCellular,
                  activeThumbColor: ZoopColors.accentGreen,
                  title: const Text('Wi-Fi Only (Pause on Cellular)'),
                  subtitle: const Text(
                    'Automatically stops sharing egress when connected to mobile data.',
                    style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                  ),
                  onChanged: (val) {
                    notifier.updateSafeguards(pauseOnCellular: val);
                  },
                ),
                const Divider(height: 1, color: ZoopColors.surfaceBorder),
                SwitchListTile(
                  value: settings.pauseOnLowBattery,
                  activeThumbColor: ZoopColors.accentGreen,
                  title: const Text('Battery Protection (< 20%)'),
                  subtitle: const Text(
                    'Pauses sharing if battery drops below 20% and device is unplugged.',
                    style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                  ),
                  onChanged: (val) {
                    notifier.updateSafeguards(pauseOnLowBattery: val);
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Section 3: Bandwidth Rate Limit
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'MAX BANDWIDTH LIMIT',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.2,
                      color: ZoopColors.textSecondary,
                    ),
              ),
              Text(
                settings.bandwidthLimitMbps > 0
                    ? '${settings.bandwidthLimitMbps} Mbps'
                    : 'Unlimited',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: ZoopColors.primaryCyan,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Slider(
            value: settings.bandwidthLimitMbps.toDouble(),
            min: 10,
            max: 100,
            divisions: 9,
            activeColor: ZoopColors.accentPurple,
            inactiveColor: ZoopColors.surfaceBorder,
            label: '${settings.bandwidthLimitMbps} Mbps',
            onChanged: (val) {
              notifier.updateSafeguards(bandwidthLimitMbps: val.toInt());
            },
          ),

          const SizedBox(height: 20),

          // Close button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: ZoopColors.surfaceElevated,
                foregroundColor: ZoopColors.textPrimary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: ZoopColors.surfaceBorder),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }
}
