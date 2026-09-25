import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../settings/application/settings_notifier.dart';
import '../../application/connections_notifier.dart';
import '../../domain/connection_models.dart';
import '../widgets/connection_session_sheet.dart';
import '../widgets/provider_profile_sheet.dart';

class ConnectionsScreen extends ConsumerStatefulWidget {
  const ConnectionsScreen({super.key});

  @override
  ConsumerState<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends ConsumerState<ConnectionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _showSessionSheet(ActiveConnectionItem conn) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ConnectionSessionSheet(
        connection: conn,
        onDisconnect: () {
          ref.read(connectionsProvider.notifier).disconnect(conn.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Disconnected from ${conn.peerName}'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        },
      ),
    );
  }

  void _showProviderSheet(DiscoveredProvider prov) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ProviderProfileSheet(
        provider: prov,
        onConnect: () {
          final settings = ref.read(settingsProvider);
          ref.read(connectionsProvider.notifier).connectToProvider(
            prov,
            zeroBalance: settings.zeroBalanceEnabled,
            carrierKey: settings.zeroBalanceCarrier,
          );
          final statusMsg = 'Connecting to ${prov.name} via secure mesh tunnel...';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(statusMsg),
              backgroundColor: ZoopColors.primaryCyan,
            ),
          );
          _tabController.animateTo(0);
        },
      ),
    );
  }

  void _showFilterSheet() {
    final state = ref.read(connectionsProvider);
    final notifier = ref.read(connectionsProvider.notifier);

    showModalBottomSheet(
      context: context,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Filter Connections',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: ZoopColors.textMuted, size: 20),
                      tooltip: 'Close',
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildFilterOption(
                  ctx,
                  label: 'All Connections & Providers',
                  value: 'all',
                  selectedValue: state.selectedFilter,
                  onSelect: () {
                    notifier.setFilter('all');
                    Navigator.pop(ctx);
                  },
                ),
                _buildFilterOption(
                  ctx,
                  label: 'Direct P2P Only',
                  value: 'direct',
                  selectedValue: state.selectedFilter,
                  onSelect: () {
                    notifier.setFilter('direct');
                    Navigator.pop(ctx);
                  },
                ),
                _buildFilterOption(
                  ctx,
                  label: 'Encrypted Relays Only',
                  value: 'relay',
                  selectedValue: state.selectedFilter,
                  onSelect: () {
                    notifier.setFilter('relay');
                    Navigator.pop(ctx);
                  },
                ),
                _buildFilterOption(
                  ctx,
                  label: 'Verified Nodes Only',
                  value: 'verified',
                  selectedValue: state.selectedFilter,
                  onSelect: () {
                    notifier.setFilter('verified');
                    Navigator.pop(ctx);
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFilterOption(
    BuildContext context, {
    required String label,
    required String value,
    required String selectedValue,
    required VoidCallback onSelect,
  }) {
    final isSelected = value == selectedValue;
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              color: isSelected ? ZoopColors.primaryCyan : ZoopColors.textMuted,
              size: 20,
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? ZoopColors.primaryCyan : ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Returns 3 reliability dots colored by trustScore thresholds.
  Widget _buildReliabilityDots(double trustScore) {
    Color dotColor(int dotIndex) {
      // dot 0: always lit, dot 1: >60%, dot 2: >85%
      if (trustScore > 85) return ZoopColors.accentGreen;
      if (trustScore > 60) {
        return dotIndex < 2 ? ZoopColors.accentAmber : ZoopColors.surfaceBorder;
      }
      return dotIndex == 0 ? ZoopColors.accentRose : ZoopColors.surfaceBorder;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (i) {
        return Container(
          width: 8,
          height: 8,
          margin: EdgeInsets.only(left: i == 0 ? 0 : 4),
          decoration: BoxDecoration(
            color: dotColor(i),
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(connectionsProvider);
    final notifier = ref.read(connectionsProvider.notifier);

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.public, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Network',
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
            icon: Icon(
              Icons.sort,
              color: state.sortMode == ConnectionSortMode.latencyAsc
                  ? ZoopColors.primaryCyan
                  : ZoopColors.textSecondary,
            ),
            tooltip: state.sortMode == ConnectionSortMode.latencyAsc
                ? 'Reset sorting'
                : 'Sort by lowest latency',
            onPressed: () {
              notifier.toggleLatencySort();
              final isSorted =
                  ref.read(connectionsProvider).sortMode == ConnectionSortMode.latencyAsc;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    isSorted ? 'Sorted by lowest latency' : 'Sorting reset',
                  ),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: ZoopColors.primaryCyanDark.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ZoopColors.primaryCyan),
              ),
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(text: 'Active (${state.activeConnections.length})'),
                Tab(text: 'Discover (${state.discoveredProviders.length})'),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Search & Filter Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: notifier.setSearchQuery,
                    style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search peers, locations, node IDs...',
                      hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 13),
                      prefixIcon: const Icon(Icons.search, color: ZoopColors.textMuted, size: 18),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 16, color: ZoopColors.textMuted),
                              onPressed: () {
                                _searchController.clear();
                                notifier.setSearchQuery('');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: ZoopColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: ZoopColors.primaryCyan),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Filter icon button
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: ZoopColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: state.selectedFilter != 'all'
                              ? ZoopColors.primaryCyan
                              : ZoopColors.surfaceBorder,
                        ),
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.filter_list,
                          color: state.selectedFilter != 'all'
                              ? ZoopColors.primaryCyan
                              : ZoopColors.textSecondary,
                          size: 20,
                        ),
                        tooltip: 'Filter connections',
                        onPressed: _showFilterSheet,
                      ),
                    ),
                    if (state.selectedFilter != 'all')
                      Positioned(
                        top: 2,
                        right: 2,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: ZoopColors.primaryCyan,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),

          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: ZoopErrorBanner(
                title: 'Network Notice',
                message: state.errorMessage!,
                onRetry: notifier.refreshConnections,
              ),
            ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildActiveConnectionsTab(state.filteredActiveConnections, state.isLoading),
                _buildDiscoverProvidersTab(state.filteredDiscoveredProviders, state.isLoading),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveConnectionsTab(List<ActiveConnectionItem> connections, bool isLoading) {
    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: ref.read(connectionsProvider.notifier).refreshConnections,
      child: isLoading && connections.isEmpty
          ? ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: 3,
              itemBuilder: (_, _) => const ZoopSkeletonCard(height: 110, padding: EdgeInsets.all(16)),
            )
          : connections.isEmpty
              ? SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(24.0),
                  child: Center(
                    child: ZoopEmptyState(
                      icon: Icons.sensors_off_rounded,
                      title: 'No Active Tunnels',
                      description: 'Connect to a provider or peer from the Discover tab to share and access internet.',
                      primaryActionLabel: 'Discover Providers',
                      primaryActionIcon: Icons.travel_explore,
                      onPrimaryAction: () => _tabController.animateTo(1),
                    ),
                  ),
                )
              : ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: connections.length,
      itemBuilder: (context, index) {
        final conn = connections[index];
        return Semantics(
          button: true,
          label:
              'Active tunnel to ${conn.peerName}, latency ${conn.latencyMs}ms, ${conn.formattedRx} received, ${conn.formattedTx} transmitted. Tap to view session details.',
          child: Container(
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
                onTap: () => _showSessionSheet(conn),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: conn.routeType.color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(conn.routeType.icon, color: conn.routeType.color, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                conn.peerName,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${conn.peerId} • ${conn.platform}',
                                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: ZoopColors.surfaceBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.speed, size: 12, color: ZoopColors.accentGreen),
                              const SizedBox(width: 4),
                              Text(
                                '${conn.latencyMs}ms',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.accentGreen,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.download, size: 14, color: ZoopColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(conn.formattedRx, style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
                            const SizedBox(width: 12),
                            const Icon(Icons.upload, size: 14, color: ZoopColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(conn.formattedTx, style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
                          ],
                        ),
                        Row(
                          children: [
                            Text(
                              conn.formattedDuration,
                              style: const TextStyle(fontSize: 11, color: ZoopColors.primaryCyan, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(width: 4),
                            const Icon(Icons.chevron_right, size: 16, color: ZoopColors.textMuted),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    },
    ),
    );
  }

  Widget _buildDiscoverProvidersTab(List<DiscoveredProvider> providers, bool isLoading) {
    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: ref.read(connectionsProvider.notifier).refreshConnections,
      child: isLoading && providers.isEmpty
          ? ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: 3,
              itemBuilder: (_, _) => const ZoopSkeletonCard(height: 120, padding: EdgeInsets.all(16)),
            )
          : providers.isEmpty
              ? SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(24.0),
                  child: Center(
                    child: ZoopEmptyState(
                      icon: Icons.travel_explore_rounded,
                      title: 'No Providers Found',
                      description: 'No network providers match your current filter or search criteria. Reset filters or scan again.',
                      secondaryActionLabel: 'Reset Filters',
                      onSecondaryAction: () {
                        _searchController.clear();
                        final notifier = ref.read(connectionsProvider.notifier);
                        notifier.setSearchQuery('');
                        notifier.setFilter('all');
                        notifier.refreshConnections();
                      },
                    ),
                  ),
                )
              : ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: providers.length,
      itemBuilder: (context, index) {
        final prov = providers[index];
        // Derive latency display from existing latencyMs field
        final latencyDisplay = '${prov.latencyMs} ms';

        return Semantics(
          container: true,
          label:
              'Provider ${prov.name}, located in ${prov.location}, bandwidth capacity ${prov.bandwidthCapacityMbps} Mbps, latency ${prov.latencyMs} milliseconds, trust score ${prov.trustScore.toInt()} percent. ${prov.isVerified ? "Verified node." : ""}',
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Left: icon with route-type color (using primaryCyan as provider default)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.router, color: ZoopColors.primaryCyan, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    prov.name,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: ZoopColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (prov.isVerified) ...[
                                  const SizedBox(width: 4),
                                  const Icon(Icons.verified, color: ZoopColors.primaryCyan, size: 14),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${prov.location} • ${prov.pricingType}',
                              style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      // Latency badge (pill)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: ZoopColors.primaryCyan.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: ZoopColors.primaryCyan.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          latencyDisplay,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.primaryCyan,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.bolt, size: 14, color: ZoopColors.accentAmber),
                            const SizedBox(width: 4),
                            Text(
                              '${prov.bandwidthCapacityMbps} Mbps',
                              style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                            ),
                            const SizedBox(width: 12),
                            // Reliability dots replacing raw percentage
                            _buildReliabilityDots(prov.trustScore),
                            const SizedBox(width: 6),
                            Text(
                              '${prov.trustScore.toInt()}%',
                              style: const TextStyle(fontSize: 10, color: ZoopColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      Semantics(
                        button: true,
                        label: 'View profile for ${prov.name}',
                        child: OutlinedButton(
                          onPressed: () => _showProviderSheet(prov),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: ZoopColors.textSecondary,
                            side: const BorderSide(color: ZoopColors.surfaceBorder),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            minimumSize: const Size(64, 38),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Profile', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Semantics(
                        button: true,
                        label: 'Connect to ${prov.name}',
                        child: ElevatedButton(
                          onPressed: () {
                            ref.read(connectionsProvider.notifier).connectToProvider(prov);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Connected to ${prov.name} via WireGuard P2P'),
                                backgroundColor: ZoopColors.accentGreen,
                              ),
                            );
                            _tabController.animateTo(0);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ZoopColors.primaryCyan,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            minimumSize: const Size(72, 38),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Connect', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      );
    },
    ),
  );
}
}
