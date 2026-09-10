import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../../../core/models/peer_device.dart';
import '../../../core/network/cloud_api_client.dart';
import '../../../core/storage/secure_storage_service.dart';

class PeersState {
  final List<PeerDevice> peers;
  final PeerDevice? selectedPeer;
  final bool isLoading;
  final String? errorMessage;
  final bool isOffline;

  const PeersState({
    this.peers = const [],
    this.selectedPeer,
    this.isLoading = false,
    this.errorMessage,
    this.isOffline = false,
  });

  PeersState copyWith({
    List<PeerDevice>? peers,
    PeerDevice? selectedPeer,
    bool? isLoading,
    String? errorMessage,
    bool? isOffline,
  }) {
    return PeersState(
      peers: peers ?? this.peers,
      selectedPeer: selectedPeer ?? this.selectedPeer,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isOffline: isOffline ?? this.isOffline,
    );
  }
}

final peersNotifierProvider =
    StateNotifierProvider<PeersNotifier, PeersState>((ref) {
  final client = ref.watch(cloudApiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  final notifier = PeersNotifier(
    cloudApiClient: client,
    storageService: storage,
  );
  notifier.loadPeers();
  return notifier;
});

class PeersNotifier extends StateNotifier<PeersState> {
  final ICloudApiClient _client;
  final ISecureStorageService _storage;

  PeersNotifier({
    required ICloudApiClient cloudApiClient,
    required ISecureStorageService storageService,
  })  : _client = cloudApiClient,
        _storage = storageService,
        super(const PeersState());

  /// Queries the Cloud Control Plane for accessible mesh nodes.
  Future<void> loadPeers() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();

      if (endpointId == null || seed == null) {
        state = state.copyWith(isLoading: false);
        return;
      }

      final allDevices = await _client.listDevices(
        endpointId: endpointId,
        privateKeySeed: seed,
      );

      // Filter out self so the user only connects to remote providers
      final peerNodes = allDevices
          .where((d) => d.endpointId.isNotEmpty && d.endpointId != endpointId)
          .toList();

      PeerDevice? activeSelected = state.selectedPeer;
      if (activeSelected == null && peerNodes.isNotEmpty) {
        activeSelected = peerNodes.first;
      } else if (activeSelected != null) {
        // Keep selected if still present, else update
        final exists = peerNodes.any((d) => d.endpointId == activeSelected?.endpointId);
        if (!exists && peerNodes.isNotEmpty) {
          activeSelected = peerNodes.first;
        }
      }

      state = state.copyWith(
        peers: peerNodes,
        selectedPeer: activeSelected,
        isLoading: false,
        isOffline: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isOffline: true,
        errorMessage: 'Failed to discover peers: $e',
      );
    }
  }

  /// Sets the target provider for outgoing WireGuard connections.
  void selectPeer(PeerDevice peer) {
    state = state.copyWith(selectedPeer: peer);
  }

  /// Retrieves endpoint candidates and WireGuard public key for the selected peer.
  Future<PeerDevice?> resolvePeerDetails(PeerDevice peer) async {
    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();
      if (endpointId == null || seed == null) return peer;

      final details = await _client.getDeviceEndpoints(
        endpointId: endpointId,
        targetDeviceId: peer.id.isNotEmpty ? peer.id : peer.endpointId,
        privateKeySeed: seed,
      );

      final wgKey = details['wireguard_public_key'] as String? ?? peer.wireguardPublicKey;
      final candidates = (details['endpoints'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          peer.endpoints;

      final updated = peer.copyWith(
        wireguardPublicKey: wgKey,
        endpoints: candidates,
      );

      // Update in state list
      final updatedList = state.peers.map((p) => p.endpointId == peer.endpointId ? updated : p).toList();
      state = state.copyWith(
        peers: updatedList,
        selectedPeer: state.selectedPeer?.endpointId == peer.endpointId ? updated : state.selectedPeer,
      );

      return updated;
    } catch (_) {
      return peer;
    }
  }

  /// Establishes an authenticated connection session with a target peer via the Cloud Control Plane.
  Future<Map<String, dynamic>?> initiatePeerConnection(PeerDevice targetPeer) async {
    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();
      if (endpointId == null || seed == null) return null;

      final targetId = targetPeer.id.isNotEmpty
          ? targetPeer.id
          : targetPeer.endpointId;

      return await _client.createConnection(
        endpointId: endpointId,
        targetDeviceId: targetId,
        privateKeySeed: seed,
      );
    } catch (_) {
      return null;
    }
  }
}
