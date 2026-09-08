import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/fleet_device_model.dart';

class DevicesState {
  final List<FleetDeviceItem> devices;
  final bool isLoading;
  final String? errorMessage;

  const DevicesState({
    this.devices = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  List<FleetDeviceItem> get onlineDevices =>
      devices.where((d) => d.isOnline).toList();

  List<FleetDeviceItem> get offlineDevices =>
      devices.where((d) => !d.isOnline).toList();

  DevicesState copyWith({
    List<FleetDeviceItem>? devices,
    bool? isLoading,
    String? errorMessage,
  }) {
    return DevicesState(
      devices: devices ?? this.devices,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
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
      ),
      FleetDeviceItem(
        id: 'dev-04',
        name: 'Home Backup NAS & Relay',
        platform: 'Linux Server',
        endpointId: 'ZP-DEV-LNX-8833',
        publicKeyFingerprint: 'ed25519:93ba...02ef',
        isCurrentDevice: false,
        isOnline: false,
        lastSeen: DateTime.now().subtract(const Duration(days: 2)),
        role: DeviceRole.dual,
        ipAddress: '10.88.0.15',
      ),
    ];

    state = state.copyWith(devices: list);
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
    state = state.copyWith(devices: updated);
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
