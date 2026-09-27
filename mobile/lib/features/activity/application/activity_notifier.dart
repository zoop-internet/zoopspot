import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/activity_models.dart';

class ActivityState {
  final List<ActivityEventItem> events;
  final ActivityCategory selectedCategory;
  final String searchQuery;

  const ActivityState({
    this.events = const [],
    this.selectedCategory = ActivityCategory.all,
    this.searchQuery = '',
  });

  List<ActivityEventItem> get filteredEvents {
    return events.where((e) {
      if (selectedCategory != ActivityCategory.all && e.category != selectedCategory) {
        return false;
      }
      if (searchQuery.isNotEmpty) {
        final q = searchQuery.toLowerCase();
        return e.title.toLowerCase().contains(q) ||
            e.description.toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  ActivityState copyWith({
    List<ActivityEventItem>? events,
    ActivityCategory? selectedCategory,
    String? searchQuery,
  }) {
    return ActivityState(
      events: events ?? this.events,
      selectedCategory: selectedCategory ?? this.selectedCategory,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class ActivityNotifier extends StateNotifier<ActivityState> {
  ActivityNotifier() : super(const ActivityState()) {
    _loadInitialEvents();
  }

  void _loadInitialEvents() {
    final now = DateTime.now();
    final items = [
      ActivityEventItem(
        id: 'act-01',
        timestamp: now.subtract(const Duration(minutes: 8)),
        category: ActivityCategory.connections,
        title: 'WireGuard Tunnel Established',
        description: 'Direct P2P session opened with Berlin High-Speed Mesh Gateway.',
        severity: ActivitySeverity.success,
        metadata: {
          'Peer ID': 'ZP-NODE-BERLIN-99',
          'Virtual IP': '10.88.0.2',
          'Latency': '18 ms',
          'Handshake': 'Curve25519 Verified',
        },
      ),
      ActivityEventItem(
        id: 'act-02',
        timestamp: now.subtract(const Duration(minutes: 18)),
        category: ActivityCategory.sharing,
        title: 'Inbound Client Connected',
        description: 'Jean Pixel 8 connected through your local egress gateway.',
        severity: ActivitySeverity.info,
        metadata: {
          'Requester ID': 'ZP-FR-PAR-922',
          'Platform': 'Android 14',
          'Allocated IP': '10.99.1.18',
        },
      ),
      ActivityEventItem(
        id: 'act-03',
        timestamp: now.subtract(const Duration(hours: 1, minutes: 12)),
        category: ActivityCategory.security,
        title: 'Cryptographic Identity Refreshed',
        description: 'Device Ed25519 keypair verified against cloud control server in Frankfurt.',
        severity: ActivitySeverity.info,
        metadata: {
          'Cloud Status': 'Trusted',
          'Endpoint': 'zoop-cloud.onrender.com',
          'Signature': 'Valid',
        },
      ),
      ActivityEventItem(
        id: 'act-04',
        timestamp: now.subtract(const Duration(hours: 3)),
        category: ActivityCategory.devices,
        title: 'Node Authorization Completed',
        description: 'Work MacBook Pro M3 successfully paired via Zoop QR code exchange.',
        severity: ActivitySeverity.success,
        metadata: {
          'Device Name': 'Work MacBook Pro M3',
          'Node Key': 'ed25519:12c4...88a9',
          'Role': 'Recipient Client',
        },
      ),
      ActivityEventItem(
        id: 'act-05',
        timestamp: now.subtract(const Duration(hours: 6)),
        category: ActivityCategory.connections,
        title: 'Zero-Knowledge Relay Failover',
        description: 'Direct P2P connection degraded; auto-migrated traffic to Amsterdam relay seamlessly.',
        severity: ActivitySeverity.warning,
        metadata: {
          'Trigger': 'Carrier NAT remapping',
          'Relay Node': 'Amsterdam Encrypted Relay Node',
          'Packet Loss': '0.0%',
        },
      ),
    ];

    state = state.copyWith(events: items);
  }

  void setCategory(ActivityCategory cat) {
    state = state.copyWith(selectedCategory: cat);
  }

  void setSearchQuery(String q) {
    state = state.copyWith(searchQuery: q);
  }

  void clearLogs() {
    state = state.copyWith(events: []);
  }
}

final activityProvider =
    StateNotifierProvider<ActivityNotifier, ActivityState>((ref) {
  return ActivityNotifier();
});
