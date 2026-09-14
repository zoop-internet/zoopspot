import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/di/core_providers.dart';
import '../../../../core/network/cloud_api_client.dart';
import '../../../../core/network/i_cloud_api_client.dart';
import '../../../../core/storage/i_secure_storage_service.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../domain/fleet_device_model.dart';

class DevicesState {
  final List<FleetDeviceItem> devices;
  final bool isLoading;
  final String? errorMessage;
  final String? activeExitNodeId;

  const DevicesState({
    this.devices = const [],
    this.isLoading = false,
    this.errorMessage,
    this.activeExitNodeId,
  });

  List<FleetDeviceItem> get onlineDevices =>
      devices.where((d) => d.isOnline).toList();

  List<FleetDeviceItem> get offlineDevices =>
      devices.where((d) => !d.isOnline).toList();

  List<FleetDeviceItem> get gateways =>
      devices.where((d) => d.isExitNode || d.role == DeviceRole.provider).toList();

  FleetDeviceItem? get activeExitNode {
    if (activeExitNodeId == null) return null;
    for (final d in devices) {
      if (d.id == activeExitNodeId) return d;
    }
    return null;
  }

  DevicesState copyWith({
    List<FleetDeviceItem>? devices,
    bool? isLoading,
    String? errorMessage,
    String? activeExitNodeId,
    bool clearActiveExitNode = false,
  }) {
    return DevicesState(
      devices: devices ?? this.devices,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      activeExitNodeId: clearActiveExitNode
          ? null
          : (activeExitNodeId ?? this.activeExitNodeId),
    );
  }
}

class DevicesNotifier extends StateNotifier<DevicesState> {
  final ICloudApiClient? _client;
  final ISecureStorageService? _storage;

  DevicesNotifier({
    ICloudApiClient? client,
    ISecureStorageService? storage,
    bool autoLoad = true,
  })  : _client = client,
        _storage = storage,
        super(const DevicesState()) {
    if (_client != null && _storage != null && autoLoad) {
      loadDevices();
    } else {
      _loadInitialDevices();
    }
  }

  Future<void> loadDevices() async {
    if (_client == null || _storage == null) return;
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final endpointId = await _storage.getEndpointId();
      final seed = await _storage.getEd25519SeedBytes();

      if (endpointId == null || seed == null) {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Device identity not initialized',
        );
        return;
      }

      // 1. Fetch all registered devices to resolve public keys & names
      final allDevices = await _client.listDevices(
        endpointId: endpointId,
        privateKeySeed: seed,
      );
      final deviceLookup = {for (var d in allDevices) d.endpointId: d};

      final items = <FleetDeviceItem>[];

      // 2. Add Current Device
      final currentZoopId = await _storage.getZoopId() ?? 'Local Node';
      items.add(FleetDeviceItem(
        id: endpointId,
        name: 'My Device ($currentZoopId)',
        platform: 'Android',
        endpointId: endpointId,
        publicKeyFingerprint: 'ed25519:${endpointId.length > 8 ? endpointId.substring(0, 8) : endpointId}',
        isCurrentDevice: true,
        isOnline: true,
        lastSeen: DateTime.now(),
        role: DeviceRole.dual,
        ipAddress: '100.64.0.1',
        pingMs: 0,
        connectionType: 'Direct P2P',
        source: 'This Device',
      ));

      // 3. Fetch Shares (/v1/shares)
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
            final isActive = item['is_active'] as bool? ?? true;
            if (providerId.isNotEmpty && providerId != endpointId && isActive) {
              final dev = deviceLookup[providerId];
              final name = dev?.name ?? 'Shared Node (${providerId.substring(0, providerId.length > 8 ? 8 : providerId.length)})';
              final platform = dev?.platform ?? 'Linux';
              final wgKey = dev?.wireguardPublicKey;
              final fp = (wgKey != null && wgKey.isNotEmpty)
                  ? 'wg:${wgKey.substring(0, wgKey.length > 8 ? 8 : wgKey.length)}...'
                  : 'ed25519:${providerId.substring(0, providerId.length > 8 ? 8 : providerId.length)}';
              items.add(FleetDeviceItem(
                id: providerId,
                name: name,
                platform: platform,
                endpointId: providerId,
                publicKeyFingerprint: fp,
                isCurrentDevice: false,
                isOnline: dev?.status == 'active',
                lastSeen: DateTime.now(),
                role: DeviceRole.provider,
                ipAddress: (dev?.endpoints != null && dev!.endpoints.isNotEmpty) ? dev.endpoints.first : 'Dynamic',
                pingMs: 16,
                isExitNode: true,
                connectionType: 'Direct P2P',
                source: 'Friend Share',
              ));
            }
          }
        }
      } catch (_) {}

      // 4. Fetch Paired Fleet Devices (/v1/devices/{id}/fleet)
      try {
        final fleet = await _client.getFleetDevices(
          endpointId: endpointId,
          privateKeySeed: seed,
        );

        for (final item in fleet) {
          final devId = (item['id'] as String? ?? item['endpoint_id'] as String? ?? '').trim();
          if (devId.isNotEmpty && devId != endpointId) {
            final dev = deviceLookup[devId];
            final name = item['name'] as String? ?? dev?.name ?? 'Fleet Node';
            final platform = (item['platform'] ?? item['os']) as String? ?? dev?.platform ?? 'Linux';
            final wgKey = dev?.wireguardPublicKey;
            final fp = (wgKey != null && wgKey.isNotEmpty)
                ? 'wg:${wgKey.substring(0, wgKey.length > 8 ? 8 : wgKey.length)}...'
                : 'ed25519:${devId.substring(0, devId.length > 8 ? 8 : devId.length)}';
            items.add(FleetDeviceItem(
              id: devId,
              name: name,
              platform: platform,
              endpointId: devId,
              publicKeyFingerprint: fp,
              isCurrentDevice: false,
              isOnline: true,
              lastSeen: DateTime.now(),
              role: DeviceRole.dual,
              ipAddress: (dev?.endpoints != null && dev!.endpoints.isNotEmpty) ? dev.endpoints.first : 'Dynamic',
              pingMs: 12,
              isExitNode: true,
              connectionType: 'Direct P2P',
              source: 'My Fleet',
            ));
          }
        }
      } catch (_) {}

      state = state.copyWith(devices: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to synchronize devices: $e',
      );
    }
  }

  void _loadInitialDevices() {
    final list = [
      FleetDeviceItem(
        id: 'dev-01',
        name: 'Zoop Primary Phone',
        platform: 'Android 14',
        endpointId: 'ZP-DEV-ANDR-9801',
        publicKeyFingerprint: 'ed25519:e4a8...7b21',
        isCurrentDevice: true,
        isOnline: true,
        lastSeen: DateTime.now(),
        role: DeviceRole.dual,
        ipAddress: '10.88.0.1',
        pingMs: 0,
        connectionType: 'Direct P2P',
      ),
      FleetDeviceItem(
        id: 'dev-02',
        name: 'Work MacBook Pro M3',
        platform: 'macOS Sonoma',
        endpointId: 'ZP-DEV-MAC-4412',
        publicKeyFingerprint: 'ed25519:12c4...88a9',
        isCurrentDevice: false,
        isOnline: true,
        lastSeen: DateTime.now().subtract(const Duration(minutes: 2)),
        role: DeviceRole.recipient,
        ipAddress: '10.88.0.4',
        pingMs: 14,
        connectionType: 'Direct P2P',
      ),
      FleetDeviceItem(
        id: 'dev-03',
        name: 'Berlin Dedicated Exit Node',
        platform: 'Linux Gateway',
        endpointId: 'ZP-DEV-LNX-1109',
        publicKeyFingerprint: 'ed25519:ff09...41cc',
        isCurrentDevice: false,
        isOnline: true,
        lastSeen: DateTime.now().subtract(const Duration(seconds: 40)),
        role: DeviceRole.provider,
        ipAddress: '10.88.0.10',
        pingMs: 18,
        isExitNode: true,
        subnetRoute: '0.0.0.0/0 (Global Egress)',
        connectionType: 'Direct P2P',
      ),
      FleetDeviceItem(
        id: 'dev-04',
        name: 'Home Backup NAS & Relay',
        platform: 'Linux Server',
        endpointId: 'ZP-DEV-LNX-8833',
        publicKeyFingerprint: 'ed25519:93ba...02ef',
        isCurrentDevice: false,
        isOnline: false,
        lastSeen: DateTime.now().subtract(const Duration(minutes: 8)),
        role: DeviceRole.dual,
        ipAddress: '10.88.0.15',
        pingMs: 29,
        isExitNode: true,
        subnetRoute: '192.168.1.0/24 (Home LAN)',
        connectionType: 'Direct P2P',
      ),
    ];

    state = state.copyWith(devices: list);
  }

  void toggleExitNode(String deviceId) {
    if (state.activeExitNodeId == deviceId) {
      state = state.copyWith(clearActiveExitNode: true);
    } else {
      state = state.copyWith(activeExitNodeId: deviceId);
    }
  }

  void renameDevice(String id, String newName) {
    final updated = state.devices.map((d) {
      if (d.id == id) return d.copyWith(name: newName);
      return d;
    }).toList();
    state = state.copyWith(devices: updated);
  }

  void revokeDevice(String id) {
    final updated = state.devices.where((d) => d.id != id).toList();
    final wasActive = state.activeExitNodeId == id;
    state = state.copyWith(
      devices: updated,
      clearActiveExitNode: wasActive,
    );
  }

  void removeDevice(String id) {
    revokeDevice(id);
  }

  void refreshDevices() {
    if (_client != null && _storage != null) {
      loadDevices();
    } else {
      state = state.copyWith(isLoading: true);
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) {
          state = state.copyWith(isLoading: false);
        }
      });
    }
  }
}

final devicesProvider =
    StateNotifierProvider<DevicesNotifier, DevicesState>((ref) {
  final client = ref.watch(cloudApiClientProvider);
  final storage = ref.watch(secureStorageServiceProvider);
  return DevicesNotifier(client: client, storage: storage);
});
