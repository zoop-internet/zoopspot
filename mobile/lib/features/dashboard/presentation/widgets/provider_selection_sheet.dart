import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../pairing/presentation/widgets/pairing_sheet.dart';
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
                  'Authorized Nodes',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        PairingSheet.show(context, initialTabIndex: 1);
                      },
                      icon: const Icon(Icons.pin, size: 16, color: ZoopColors.primaryCyan),
                      label: const Text(
                        'Pair PIN',
                        style: TextStyle(
                          color: ZoopColors.primaryCyan,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                    const SizedBox(width: 4),
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
                                : 'No Authorized Devices Yet',
                            description: _searchQuery.isNotEmpty
                                ? 'No devices match "$_searchQuery". Try clearing your search query.'
                                : 'Link your computer, home router, or friend\'s connection using a 6-digit PIN code or QR scan.',
                            primaryActionLabel: _searchQuery.isEmpty ? 'Enter 6-digit PIN' : null,
                            primaryActionIcon: Icons.pin,
                            onPrimaryAction: _searchQuery.isEmpty
                                ? () {
                                    Navigator.pop(context);
                                    PairingSheet.show(context, initialTabIndex: 1);
                                  }
                                : null,
                            secondaryActionLabel: _searchQuery.isNotEmpty
                                ? 'Clear Search'
                                : 'Share My Node (QR)',
                            onSecondaryAction: () {
                              if (_searchQuery.isNotEmpty) {
                                setState(() => _searchQuery = '');
                              } else {
                                Navigator.pop(context);
                                PairingSheet.show(context, initialTabIndex: 0);
                              }
                            },
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
                               (selectedPeer.endpointId.isNotEmpty && selectedPeer.endpointId == peer.endpointId))) ||
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
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            peer.name,
                                            overflow: TextOverflow.ellipsis,
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
                                        ),
                                        if (peer.source.isNotEmpty) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: (peer.source == 'Friend Share'
                                                      ? ZoopColors.accentPurple
                                                      : ZoopColors.primaryCyan)
                                                  .withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(
                                                color: (peer.source == 'Friend Share'
                                                        ? ZoopColors.accentPurple
                                                        : ZoopColors.primaryCyan)
                                                    .withValues(alpha: 0.3),
                                                width: 1,
                                              ),
                                            ),
                                            child: Text(
                                              peer.source,
                                              style: TextStyle(
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.bold,
                                                color: peer.source == 'Friend Share'
                                                    ? ZoopColors.accentPurple
                                                    : ZoopColors.primaryCyan,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Text(
                                          peer.platform.toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 10.5,
                                            color: ZoopColors.textMuted,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          '•  Direct P2P Ready',
                                          style: TextStyle(
                                            fontSize: 10.5,
                                            color: ZoopColors.accentGreen,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
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
          if (filteredPeers.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  PairingSheet.show(context, initialTabIndex: 1);
                },
                icon: const Icon(Icons.add, size: 16),
                label: const Text(
                  'Pair Another Node with PIN / QR',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: ZoopColors.primaryCyan,
                  side: BorderSide(color: ZoopColors.primaryCyan.withValues(alpha: 0.4)),
                  minimumSize: const Size(double.infinity, 44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
