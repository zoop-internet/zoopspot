import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/peer_device.dart';
import '../../../core/network/cloud_api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../identity/application/identity_notifier.dart';

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
  ref.watch(identityNotifierProvider);
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

  /// Queries the Cloud Control Plane for authorized mesh nodes (Friend Shares & Personal Fleet).
  Future<void> loadPeers() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();

      if (endpointId == null || seed == null) {
        state = state.copyWith(isLoading: false);
        return;
      }

      // 1. Fetch all registered devices to resolve names, platforms, and public keys
      final allDevices = await _client.listDevices(
        endpointId: endpointId,
        privateKeySeed: seed,
      );
      final deviceMap = <String, PeerDevice>{};
      for (final d in allDevices) {
        if (d.endpointId.isNotEmpty) deviceMap[d.endpointId] = d;
        if (d.id.isNotEmpty) deviceMap[d.id] = d;
      }

      final authorizedPeers = <String, PeerDevice>{};

      // 2. Fetch Active Shares (/v1/shares) - Sharing relationships with friends / providers
      try {
        final sharesResult = await _client.authenticatedRequest(
          method: 'GET',
          path: '/v1/shares',
          endpointId: endpointId,
          privateKeySeed: seed,
        );

        List<dynamic> sharesList = [];
        if (sharesResult is List) {
          sharesList = sharesResult;
        } else if (sharesResult is Map<String, dynamic> && sharesResult['shares'] is List) {
          sharesList = sharesResult['shares'] as List;
        }

        for (final item in sharesList) {
          if (item is Map<String, dynamic>) {
            final providerId = (item['provider_id'] as String? ?? '').trim();
            final shareId = item['id'] as String?;
            final isActive = item['is_active'] as bool? ?? true;

            if (providerId.isNotEmpty && providerId != endpointId && isActive) {
              final dev = deviceMap[providerId];
              if (dev != null) {
                authorizedPeers[providerId] = dev.copyWith(
                  source: 'Friend Share',
                  shareId: shareId,
                  isAuthorized: true,
                );
              } else {
                final shortId = providerId.length > 8 ? providerId.substring(0, 8) : providerId;
                authorizedPeers[providerId] = PeerDevice(
                  id: providerId,
                  endpointId: providerId,
                  name: 'Shared Node ($shortId)',
                  platform: 'linux',
                  status: 'active',
                  source: 'Friend Share',
                  shareId: shareId,
                  isAuthorized: true,
                );
              }
            }
          }
        }
      } catch (_) {
        // Continue to fleet even if shares fetch has no entries
      }

      // 3. Fetch Paired Personal Fleet Devices (/v1/devices/{endpointId}/fleet)
      try {
        final fleet = await _client.getFleetDevices(
          endpointId: endpointId,
          privateKeySeed: seed,
        );

        for (final item in fleet) {
          final devId = (item['id'] as String? ?? item['endpoint_id'] as String? ?? '').trim();
          if (devId.isNotEmpty && devId != endpointId) {
            final existing = deviceMap[devId];
            final name = item['name'] as String? ?? existing?.name ?? 'Fleet Node';
            final platform = (item['platform'] ?? item['os']) as String? ?? existing?.platform ?? 'linux';

            authorizedPeers[devId] = (existing ?? PeerDevice(
              id: devId,
              endpointId: devId,
              name: name,
              platform: platform,
            )).copyWith(
              name: name,
              platform: platform,
              source: 'My Fleet',
              isAuthorized: true,
            );
          }
        }
      } catch (_) {
        // Continue without fleet
      }

      // Only authorized peers (shared nodes or personal fleet devices) should be presented as accessible.
      // Unpaired/unauthorized cloud registry devices must not clutter the user's peer list on fresh install.
      final peerNodes = authorizedPeers.values.toList();

      PeerDevice? activeSelected = state.selectedPeer;
      if (activeSelected == null && peerNodes.isNotEmpty) {
        activeSelected = peerNodes.first;
      } else if (activeSelected != null) {
        final exists = peerNodes.any((d) =>
            (d.endpointId.isNotEmpty && d.endpointId == activeSelected?.endpointId) ||
            (d.id.isNotEmpty && d.id == activeSelected?.id));
        if (!exists && peerNodes.isNotEmpty) {
          activeSelected = peerNodes.first;
        } else if (!exists && peerNodes.isEmpty) {
          activeSelected = null;
        }
      }

      if (!mounted) return;
      state = state.copyWith(
        peers: peerNodes,
        selectedPeer: activeSelected,
        isLoading: false,
        isOffline: false,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        isOffline: true,
        errorMessage: 'Failed to discover authorized peers: $e',
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
      final wgPubKey = await _storage.getWireGuardPublicKeyBase64();
      if (endpointId == null || seed == null) return null;

      final targetId = targetPeer.id.isNotEmpty
          ? targetPeer.id
          : targetPeer.endpointId;

      return await _client.createConnection(
        endpointId: endpointId,
        targetDeviceId: targetId,
        privateKeySeed: seed,
        wireguardPublicKey: wgPubKey,
      );
    } catch (_) {
      return null;
    }
  }
}
