import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/connection_models.dart';

enum ConnectionSortMode {
  none,
  latencyAsc,
  trustScoreDesc,
  bandwidthDesc,
}

class ConnectionsState {
  final List<ActiveConnectionItem> activeConnections;
  final List<DiscoveredProvider> discoveredProviders;
  final String searchQuery;
  final String selectedFilter;
  final ConnectionSortMode sortMode;
  final bool isLoading;
  final String? errorMessage;

  const ConnectionsState({
    this.activeConnections = const [],
    this.discoveredProviders = const [],
    this.searchQuery = '',
    this.selectedFilter = 'all',
    this.sortMode = ConnectionSortMode.none,
    this.isLoading = false,
    this.errorMessage,
  });

  List<ActiveConnectionItem> get filteredActiveConnections {
    final list = activeConnections.where((conn) {
      final matchesQuery = conn.peerName.toLowerCase().contains(searchQuery.toLowerCase()) ||
          conn.peerId.toLowerCase().contains(searchQuery.toLowerCase());
      if (!matchesQuery) return false;
      if (selectedFilter == 'direct') {
        return conn.routeType == ConnectionRouteType.directP2P;
      } else if (selectedFilter == 'relay') {
        return conn.routeType == ConnectionRouteType.encryptedRelay;
      }
      return true;
    }).toList();

    if (sortMode == ConnectionSortMode.latencyAsc) {
      list.sort((a, b) => a.latencyMs.compareTo(b.latencyMs));
    }
    return list;
  }

  List<DiscoveredProvider> get filteredDiscoveredProviders {
    final list = discoveredProviders.where((prov) {
      final matchesQuery = prov.name.toLowerCase().contains(searchQuery.toLowerCase()) ||
          prov.location.toLowerCase().contains(searchQuery.toLowerCase()) ||
          prov.zoopId.toLowerCase().contains(searchQuery.toLowerCase());
      if (!matchesQuery) return false;
      if (selectedFilter == 'verified') {
        return prov.isVerified;
      }
      return true;
    }).toList();

    switch (sortMode) {
      case ConnectionSortMode.latencyAsc:
        list.sort((a, b) => a.latencyMs.compareTo(b.latencyMs));
        break;
      case ConnectionSortMode.trustScoreDesc:
        list.sort((a, b) => b.trustScore.compareTo(a.trustScore));
        break;
      case ConnectionSortMode.bandwidthDesc:
        list.sort((a, b) => b.bandwidthCapacityMbps.compareTo(a.bandwidthCapacityMbps));
        break;
      case ConnectionSortMode.none:
        break;
    }
    return list;
  }

  ConnectionsState copyWith({
    List<ActiveConnectionItem>? activeConnections,
    List<DiscoveredProvider>? discoveredProviders,
    String? searchQuery,
    String? selectedFilter,
    ConnectionSortMode? sortMode,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ConnectionsState(
      activeConnections: activeConnections ?? this.activeConnections,
      discoveredProviders: discoveredProviders ?? this.discoveredProviders,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedFilter: selectedFilter ?? this.selectedFilter,
      sortMode: sortMode ?? this.sortMode,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class ConnectionsNotifier extends StateNotifier<ConnectionsState> {
  Timer? _tickerTimer;

  ConnectionsNotifier() : super(const ConnectionsState()) {
    _loadInitialData();
    _startThroughputTicker();
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
    super.dispose();
  }

  void _loadInitialData() {
    final active = [
      ActiveConnectionItem(
        id: 'conn-01',
        peerId: 'ZP-NODE-BERLIN-99',
        peerName: 'Berlin High-Speed Mesh Gateway',
        platform: 'Linux Gateway',
        routeType: ConnectionRouteType.directP2P,
        sessionDurationSeconds: 1420,
        rxBytes: 485000000,
        txBytes: 132000000,
        latencyMs: 18,
        packetLossPct: 0.0,
        connectedAt: DateTime.now().subtract(const Duration(minutes: 23)),
        qualityScore: 99.2,
        tunnelIp: '10.88.0.2/32',
      ),
      ActiveConnectionItem(
        id: 'conn-02',
        peerId: 'ZP-NODE-AMS-44',
        peerName: 'Amsterdam Encrypted Relay Node',
        platform: 'macOS Server',
        routeType: ConnectionRouteType.encryptedRelay,
        sessionDurationSeconds: 4320,
        rxBytes: 1240000000,
        txBytes: 310000000,
        latencyMs: 34,
        packetLossPct: 0.2,
        connectedAt: DateTime.now().subtract(const Duration(minutes: 72)),
        qualityScore: 96.5,
        tunnelIp: '10.88.0.5/32',
      ),
    ];

    final providers = [
      const DiscoveredProvider(
        id: 'prov-01',
        zoopId: 'ZP-DE-FRK-01',
        name: 'Frankfurt Fiber Backbone',
        platform: 'Linux Dedicated',
        isOnline: true,
        trustScore: 99.8,
        bandwidthCapacityMbps: 1000,
        latencyMs: 14,
        pricingType: 'Community Free Tier',
        routingCapabilities: ['Full Internet', 'Split Tunnel', 'WireGuard Native'],
        location: 'Frankfurt, DE',
        isVerified: true,
        publicKey: 'pub_wg_0x8f43...99ac',
      ),
      const DiscoveredProvider(
        id: 'prov-02',
        zoopId: 'ZP-CH-ZUR-09',
        name: 'Zurich Zero-Knowledge Vault',
        platform: 'Alpine Server',
        isOnline: true,
        trustScore: 99.5,
        bandwidthCapacityMbps: 500,
        latencyMs: 22,
        pricingType: 'UGX 75 / GB',
        routingCapabilities: ['Full Internet', 'Tor Exit Bridging'],
        location: 'Zurich, CH',
        isVerified: true,
        publicKey: 'pub_wg_0x44d1...81fe',
      ),
      const DiscoveredProvider(
        id: 'prov-03',
        zoopId: 'ZP-UK-LON-12',
        name: 'London Metro Relay Gateway',
        platform: 'Ubuntu Core',
        isOnline: true,
        trustScore: 97.4,
        bandwidthCapacityMbps: 250,
        latencyMs: 28,
        pricingType: 'Community Free Tier',
        routingCapabilities: ['Full Internet', 'Split Tunnel'],
        location: 'London, UK',
        isVerified: false,
        publicKey: 'pub_wg_0x992b...33ef',
      ),
      const DiscoveredProvider(
        id: 'prov-04',
        zoopId: 'ZP-SE-STO-07',
        name: 'Stockholm Arctic Node',
        platform: 'FreeBSD Gateway',
        isOnline: true,
        trustScore: 98.9,
        bandwidthCapacityMbps: 800,
        latencyMs: 38,
        pricingType: 'Community Free Tier',
        routingCapabilities: ['Full Internet', 'WireGuard Native'],
        location: 'Stockholm, SE',
        isVerified: true,
        publicKey: 'pub_wg_0xaa12...77df',
      ),
    ];

    state = state.copyWith(
      activeConnections: active,
      discoveredProviders: providers,
    );
  }

  void _startThroughputTicker() {
    _tickerTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      final updated = state.activeConnections.map((conn) {
        return conn.copyWith(
          sessionDurationSeconds: conn.sessionDurationSeconds + 2,
          rxBytes: conn.rxBytes + (125000 + (conn.latencyMs * 500)),
          txBytes: conn.txBytes + (45000 + (conn.latencyMs * 150)),
        );
      }).toList();
      state = state.copyWith(activeConnections: updated);
    });
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setFilter(String filter) {
    state = state.copyWith(selectedFilter: filter);
  }

  void toggleLatencySort() {
    if (state.sortMode == ConnectionSortMode.latencyAsc) {
      state = state.copyWith(sortMode: ConnectionSortMode.none);
    } else {
      state = state.copyWith(sortMode: ConnectionSortMode.latencyAsc);
    }
  }

  void setSortMode(ConnectionSortMode mode) {
    state = state.copyWith(sortMode: mode);
  }

  void disconnect(String connectionId) {
    final updated = state.activeConnections
        .where((conn) => conn.id != connectionId)
        .toList();
    state = state.copyWith(activeConnections: updated);
  }

  void connectToProvider(DiscoveredProvider provider) {
    // Check if already connected
    if (state.activeConnections.any((c) => c.peerId == provider.zoopId)) {
      return;
    }
    final newConn = ActiveConnectionItem(
      id: 'conn-${DateTime.now().millisecondsSinceEpoch}',
      peerId: provider.zoopId,
      peerName: provider.name,
      platform: provider.platform,
      routeType: ConnectionRouteType.directP2P,
      sessionDurationSeconds: 0,
      rxBytes: 12000,
      txBytes: 8400,
      latencyMs: provider.latencyMs,
      packetLossPct: 0.0,
      connectedAt: DateTime.now(),
      qualityScore: provider.trustScore,
      tunnelIp: '10.88.0.${state.activeConnections.length + 10}/32',
    );
    state = state.copyWith(
      activeConnections: [newConn, ...state.activeConnections],
    );
  }

  /// Refreshes active connections and scans for available mesh providers
  Future<void> refreshConnections() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      _loadInitialData();
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to refresh connections: $e');
    }
  }
}

final connectionsProvider =
    StateNotifierProvider<ConnectionsNotifier, ConnectionsState>((ref) {
  return ConnectionsNotifier();
});
