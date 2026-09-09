import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/peers_notifier.dart';

class ProviderSelectionSheet extends ConsumerStatefulWidget {
  const ProviderSelectionSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ProviderSelectionSheet(),
    );
  }

  @override
  ConsumerState<ProviderSelectionSheet> createState() =>
      _ProviderSelectionSheetState();
}

class _ProviderSelectionSheetState
    extends ConsumerState<ProviderSelectionSheet> {
  String _searchQuery = '';

  IconData _getPlatformIcon(String platform) {
    final p = platform.toLowerCase();
    if (p.contains('android')) return Icons.phone_android_rounded;
    if (p.contains('darwin') || p.contains('ios') || p.contains('mac')) {
      return Icons.laptop_mac_rounded;
    }
    if (p.contains('windows')) return Icons.desktop_windows_rounded;
    if (p.contains('router') || p.contains('openwrt')) {
      return Icons.router_rounded;
    }
    return Icons.dns_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final peersState = ref.watch(peersNotifierProvider);
    final selectedPeer = peersState.selectedPeer;

    final filteredPeers = peersState.peers.where((peer) {
      if (_searchQuery.isEmpty) return true;
      return peer.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          peer.platform.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          // Clean Drag Handle
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: ZoopColors.surfaceBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Select Device',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                IconButton(
                  icon: peersState.isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: ZoopColors.primaryCyan,
                          ),
                        )
                      : const Icon(Icons.refresh,
                          size: 20, color: ZoopColors.textSecondary),
                  onPressed: peersState.isLoading
                      ? null
                      : () =>
                          ref.read(peersNotifierProvider.notifier).loadPeers(),
                ),
              ],
            ),
          ),

          // Search Bar with Clean Underline
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(
                color: ZoopColors.textPrimary,
                fontSize: 14,
              ),
              cursorColor: ZoopColors.primaryCyan,
              decoration: const InputDecoration(
                hintText: 'Search devices...',
                hintStyle: TextStyle(
                  color: ZoopColors.textMuted,
                  fontSize: 14,
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: ZoopColors.textMuted,
                  size: 20,
                ),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(
                    color: ZoopColors.surfaceBorder,
                    width: 1.5,
                  ),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(
                    color: ZoopColors.primaryCyan,
                    width: 1.5,
                  ),
                ),
                contentPadding: EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Device List (Calm, non-highlighted items)
          Expanded(
            child: filteredPeers.isEmpty
                ? Center(
                    child: Text(
                      peersState.isLoading
                          ? 'Loading nodes...'
                          : 'No devices found',
                      style: const TextStyle(
                        color: ZoopColors.textMuted,
                        fontSize: 13,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 8.0),
                    itemCount: filteredPeers.length,
                    separatorBuilder: (_, __) => const Divider(
                      color: ZoopColors.surfaceBorder,
                      height: 1,
                      indent: 52,
                    ),
                    itemBuilder: (context, index) {
                      final peer = filteredPeers[index];
                      final isSelected = (selectedPeer != null &&
                              ((selectedPeer.id.isNotEmpty && selectedPeer.id == peer.id) ||
                               (selectedPeer.endpointId.isNotEmpty && selectedPeer.endpointId == peer.endpointId) ||
                               selectedPeer.name == peer.name)) ||
                          (selectedPeer == null && index == 0);

                      return InkWell(
                        onTap: () {
                          ref
                              .read(peersNotifierProvider.notifier)
                              .selectPeer(peer);
                          Navigator.pop(context);
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8.0, vertical: 12.0),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: ZoopColors.surfaceElevated,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  _getPlatformIcon(peer.platform),
                                  color: isSelected
                                      ? ZoopColors.primaryCyan
                                      : ZoopColors.textSecondary,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      peer.name,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isSelected
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                        color: isSelected
                                            ? ZoopColors.primaryCyan
                                            : ZoopColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      peer.platform.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 10.5,
                                        color: ZoopColors.textMuted,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: ZoopColors.primaryCyan,
                                  size: 20,
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
  }
}
