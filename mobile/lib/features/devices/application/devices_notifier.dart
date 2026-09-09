import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  DevicesNotifier() : super(const DevicesState()) {
    _loadInitialDevices();
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
        isOnline: true,
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
    state = state.copyWith(isLoading: true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        state = state.copyWith(isLoading: false);
      }
    });
  }
}

final devicesProvider =
    StateNotifierProvider<DevicesNotifier, DevicesState>((ref) {
  return DevicesNotifier();
});
