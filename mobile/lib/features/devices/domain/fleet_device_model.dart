import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum DeviceRole {
  dual,
  provider,
  recipient;

  String get label {
    switch (this) {
      case DeviceRole.dual:
        return 'Dual (Relay + Client)';
      case DeviceRole.provider:
        return 'Provider / Gateway';
      case DeviceRole.recipient:
        return 'Recipient / Client';
    }
  }

  Color get color {
    switch (this) {
      case DeviceRole.dual:
        return ZoopColors.primaryCyan;
      case DeviceRole.provider:
        return ZoopColors.accentPurple;
      case DeviceRole.recipient:
        return ZoopColors.accentGreen;
    }
  }
}

class FleetDeviceItem {
  final String id;
  final String name;
  final String platform; // Android, iOS, macOS, Linux, Windows, Router
  final String endpointId;
  final String publicKeyFingerprint;
  final bool isCurrentDevice;
  final bool isOnline;
  final DateTime lastSeen;
  final DeviceRole role;
  final String ipAddress;
  final String version;

  const FleetDeviceItem({
    required this.id,
    required this.name,
    required this.platform,
    required this.endpointId,
    required this.publicKeyFingerprint,
    required this.isCurrentDevice,
    required this.isOnline,
    required this.lastSeen,
    required this.role,
    required this.ipAddress,
    this.version = 'v1.0.0-rc3',
  });

  IconData get platformIcon {
    final p = platform.toLowerCase();
    if (p.contains('android') || p.contains('phone')) return Icons.phone_android;
    if (p.contains('ios') || p.contains('iphone') || p.contains('ipad')) return Icons.phone_iphone;
    if (p.contains('mac')) return Icons.laptop_mac;
    if (p.contains('linux')) return Icons.terminal;
    if (p.contains('windows')) return Icons.desktop_windows;
    if (p.contains('router') || p.contains('gateway')) return Icons.router;
    return Icons.devices;
  }

  FleetDeviceItem copyWith({
    String? id,
    String? name,
    String? platform,
    String? endpointId,
    String? publicKeyFingerprint,
    bool? isCurrentDevice,
    bool? isOnline,
    DateTime? lastSeen,
    DeviceRole? role,
    String? ipAddress,
    String? version,
  }) {
    return FleetDeviceItem(
      id: id ?? this.id,
      name: name ?? this.name,
      platform: platform ?? this.platform,
      endpointId: endpointId ?? this.endpointId,
      publicKeyFingerprint: publicKeyFingerprint ?? this.publicKeyFingerprint,
      isCurrentDevice: isCurrentDevice ?? this.isCurrentDevice,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      role: role ?? this.role,
      ipAddress: ipAddress ?? this.ipAddress,
      version: version ?? this.version,
    );
  }
}
