import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../fleet/presentation/widgets/device_pairing_sheet.dart';
import '../../../identity/application/identity_notifier.dart';
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
              decoration: InputDecoration(
                hintText: 'Search devices...',
                hintStyle: const TextStyle(
                  color: ZoopColors.textMuted,
                  fontSize: 14,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: ZoopColors.textMuted,
                  size: 20,
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18, color: ZoopColors.textMuted),
                        onPressed: () => setState(() => _searchQuery = ''),
                      )
                    : null,
                enabledBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(
                    color: ZoopColors.surfaceBorder,
                    width: 1.5,
                  ),
                ),
                focusedBorder: const UnderlineInputBorder(
                  borderSide: BorderSide(
                    color: ZoopColors.primaryCyan,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          if (peersState.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 4.0),
              child: ZoopErrorBanner(
                title: 'Peer Discovery Error',
                message: peersState.errorMessage!,
                onRetry: () => ref.read(peersNotifierProvider.notifier).loadPeers(),
              ),
            ),

          const SizedBox(height: 8),

          // Device List
          Expanded(
            child: peersState.isLoading && peersState.peers.isEmpty
                ? ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    itemCount: 4,
                    itemBuilder: (_, _) => const ZoopSkeletonListTile(height: 64),
                  )
                : filteredPeers.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(20.0),
                        child: Center(
                          child: ZoopEmptyState(
                            compact: true,
                            icon: _searchQuery.isNotEmpty
                                ? Icons.search_off_rounded
                                : Icons.devices_other_rounded,
                            title: _searchQuery.isNotEmpty
                                ? 'No Matching Devices'
                                : 'No Reachable Devices Found',
                            description: _searchQuery.isNotEmpty
                                ? 'No devices match "$_searchQuery". Try clearing your search query.'
                                : 'Pair another phone, laptop, or gateway to share internet across your devices.',
                            primaryActionLabel: _searchQuery.isEmpty ? 'Pair a Device' : null,
                            primaryActionIcon: Icons.qr_code_scanner,
                            onPrimaryAction: _searchQuery.isEmpty
                                ? () {
                                    Navigator.pop(context);
                                    final identity = ref.read(identityNotifierProvider);
                                    showModalBottomSheet(
                                      context: context,
                                      isScrollControlled: true,
                                      backgroundColor: Colors.transparent,
                                      builder: (ctx) => DevicePairingSheet(
                                        deviceName: 'Android Device (${identity.zoopId ?? "ZP-Node"})',
                                        deviceId: identity.endpointId ?? 'ep-local-device',
                                      ),
                                    );
                                  }
                                : null,
                            secondaryActionLabel: _searchQuery.isNotEmpty ? 'Clear Search' : null,
                            onSecondaryAction: _searchQuery.isNotEmpty
                                ? () => setState(() => _searchQuery = '')
                                : null,
                          ),
                        ),
                      )
                    : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16.0, vertical: 8.0),
                    itemCount: filteredPeers.length,
                    separatorBuilder: (_, _) => const Divider(
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
                          ZoopFeedback.selection();
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
