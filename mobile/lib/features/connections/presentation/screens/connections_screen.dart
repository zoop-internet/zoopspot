import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
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
          ref.read(connectionsProvider.notifier).connectToProvider(prov);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Connected to ${prov.name} via WireGuard P2P'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
          _tabController.animateTo(0);
        },
      ),
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
            Icon(Icons.hub_outlined, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Connections Hub',
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
            icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
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
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildActiveConnectionsTab(state.filteredActiveConnections),
                _buildDiscoverProvidersTab(state.filteredDiscoveredProviders),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveConnectionsTab(List<ActiveConnectionItem> connections) {
    if (connections.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.link_off, size: 48, color: ZoopColors.textMuted.withValues(alpha: 0.6)),
            const SizedBox(height: 12),
            const Text(
              'No Active Connections',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ZoopColors.textSecondary),
            ),
            const SizedBox(height: 6),
            const Text(
              'Discover and connect to a trusted node from the Discover tab.',
              style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: connections.length,
      itemBuilder: (context, index) {
        final conn = connections[index];
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
        );
      },
    );
  }

  Widget _buildDiscoverProvidersTab(List<DiscoveredProvider> providers) {
    if (providers.isEmpty) {
      return const Center(
        child: Text(
          'No providers matching search filter',
          style: TextStyle(color: ZoopColors.textMuted),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: providers.length,
      itemBuilder: (context, index) {
        final prov = providers[index];
        return Container(
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${prov.trustScore}% Trust',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: ZoopColors.accentGreen,
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
                          const Icon(Icons.speed, size: 14, color: ZoopColors.textSecondary),
                          const SizedBox(width: 4),
                          Text('${prov.latencyMs}ms', style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
                          const SizedBox(width: 12),
                          const Icon(Icons.bolt, size: 14, color: ZoopColors.accentAmber),
                          const SizedBox(width: 4),
                          Text('${prov.bandwidthCapacityMbps} Mbps', style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
                        ],
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => _showProviderSheet(prov),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ZoopColors.textSecondary,
                        side: const BorderSide(color: ZoopColors.surfaceBorder),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Profile', style: TextStyle(fontSize: 12)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        ref.read(connectionsProvider.notifier).connectToProvider(prov);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Connected to ${prov.name}'),
                            backgroundColor: ZoopColors.accentGreen,
                          ),
                        );
                        _tabController.animateTo(0);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.primaryCyan,
                        foregroundColor: ZoopColors.background,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Connect', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
