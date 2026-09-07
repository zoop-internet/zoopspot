import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/peers_notifier.dart';

class ProviderSelectionSheet extends ConsumerWidget {
  const ProviderSelectionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const ProviderSelectionSheet(),
    );
  }

  IconData _getPlatformIcon(String platform) {
    final p = platform.toLowerCase();
    if (p.contains('android')) return Icons.phone_android_rounded;
    if (p.contains('darwin') || p.contains('ios') || p.contains('mac')) return Icons.laptop_mac_rounded;
    if (p.contains('windows')) return Icons.desktop_windows_rounded;
    if (p.contains('router') || p.contains('openwrt')) return Icons.router_rounded;
    return Icons.dns_rounded; // Linux server default
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final peersState = ref.watch(peersNotifierProvider);
    final selectedPeer = peersState.selectedPeer;

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sheet Handle
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

              // Title and Refresh
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Select Mesh Provider', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 2),
                        Text(
                          'Route encrypted WireGuard traffic through this peer',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: peersState.isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: ZoopColors.primaryCyan),
                          )
                        : const Icon(Icons.refresh, color: ZoopColors.textSecondary),
                    tooltip: 'Refresh Nodes',
                    onPressed: peersState.isLoading
                        ? null
                        : () => ref.read(peersNotifierProvider.notifier).loadPeers(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Error banner if any
              if (peersState.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentRose.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: ZoopColors.accentRose.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: ZoopColors.accentRose, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          peersState.errorMessage!,
                          style: const TextStyle(color: ZoopColors.accentRose, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Peer List
              Expanded(
                child: peersState.peers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                color: ZoopColors.surfaceElevated,
                                shape: BoxShape.circle,
                                border: Border.all(color: ZoopColors.surfaceBorder),
                              ),
                              child: const Icon(Icons.hub_outlined, color: ZoopColors.textMuted, size: 32),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No Other Nodes Discovered',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Register another device or router under this identity\nto form a peer-to-peer connection.',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted),
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton.icon(
                              onPressed: () => ref.read(peersNotifierProvider.notifier).loadPeers(),
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Check Again'),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: peersState.peers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final peer = peersState.peers[index];
                          final isSelected = selectedPeer?.endpointId == peer.endpointId;

                          return InkWell(
                            onTap: () {
                              ref.read(peersNotifierProvider.notifier).selectPeer(peer);
                              Navigator.of(context).pop();
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isSelected ? ZoopColors.surfaceElevated : ZoopColors.surface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected
                                      ? ZoopColors.primaryCyan
                                      : ZoopColors.surfaceBorder,
                                  width: isSelected ? 1.5 : 1.0,
                                ),
                              ),
                              child: Row(
                                children: [
                                  // Platform Icon
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: ZoopColors.surface,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: isSelected
                                            ? ZoopColors.primaryCyan.withValues(alpha: 0.5)
                                            : ZoopColors.surfaceBorder,
                                      ),
                                    ),
                                    child: Icon(
                                      _getPlatformIcon(peer.platform),
                                      color: isSelected ? ZoopColors.primaryCyan : ZoopColors.textSecondary,
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 14),

                                  // Name and Platform
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          peer.name,
                                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                                fontWeight: FontWeight.w700,
                                                color: isSelected ? ZoopColors.primaryCyan : ZoopColors.textPrimary,
                                              ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${peer.platform.toUpperCase()} • ID: ${peer.endpointId.substring(0, peer.endpointId.length >= 8 ? 8 : peer.endpointId.length)}...',
                                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                                fontSize: 11,
                                                color: ZoopColors.textMuted,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Online Status & Selected Checkmark
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: (peer.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted)
                                              .withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          peer.isOnline ? 'ONLINE' : 'STANDBY',
                                          style: TextStyle(
                                            color: peer.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                      if (isSelected) ...[
                                        const SizedBox(height: 4),
                                        const Icon(Icons.check_circle, size: 18, color: ZoopColors.primaryCyan),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
