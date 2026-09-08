import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum ConnectionRouteType {
  directP2P,
  encryptedRelay,
  meshMultiHop;

  String get label {
    switch (this) {
      case ConnectionRouteType.directP2P:
        return 'Direct WireGuard P2P';
      case ConnectionRouteType.encryptedRelay:
        return 'Zero-Knowledge Relay';
      case ConnectionRouteType.meshMultiHop:
        return 'Mesh Multi-Hop';
    }
  }

  Color get color {
    switch (this) {
      case ConnectionRouteType.directP2P:
        return ZoopColors.directP2P;
      case ConnectionRouteType.encryptedRelay:
        return ZoopColors.relay;
      case ConnectionRouteType.meshMultiHop:
        return ZoopColors.roaming;
    }
  }

  IconData get icon {
    switch (this) {
      case ConnectionRouteType.directP2P:
        return Icons.flash_on;
      case ConnectionRouteType.encryptedRelay:
        return Icons.shield;
      case ConnectionRouteType.meshMultiHop:
        return Icons.device_hub;
    }
  }
}

class ActiveConnectionItem {
  final String id;
  final String peerId;
  final String peerName;
  final String platform;
  final ConnectionRouteType routeType;
  final int sessionDurationSeconds;
  final int rxBytes;
  final int txBytes;
  final int latencyMs;
  final double packetLossPct;
  final DateTime connectedAt;
  final double qualityScore;
  final String tunnelIp;
  final String cipherSuite;

  const ActiveConnectionItem({
    required this.id,
    required this.peerId,
    required this.peerName,
    required this.platform,
    required this.routeType,
    required this.sessionDurationSeconds,
    required this.rxBytes,
    required this.txBytes,
    required this.latencyMs,
    required this.packetLossPct,
    required this.connectedAt,
    required this.qualityScore,
    required this.tunnelIp,
    this.cipherSuite = 'ChaCha20-Poly1305',
  });

  String get formattedDuration {
    final hours = sessionDurationSeconds ~/ 3600;
    final minutes = (sessionDurationSeconds % 3600) ~/ 60;
    final seconds = sessionDurationSeconds % 60;
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m ${seconds}s';
  }

  String get formattedRx => _formatBytes(rxBytes);
  String get formattedTx => _formatBytes(txBytes);

  static String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  ActiveConnectionItem copyWith({
    String? id,
    String? peerId,
    String? peerName,
    String? platform,
    ConnectionRouteType? routeType,
    int? sessionDurationSeconds,
    int? rxBytes,
    int? txBytes,
    int? latencyMs,
    double? packetLossPct,
    DateTime? connectedAt,
    double? qualityScore,
    String? tunnelIp,
    String? cipherSuite,
  }) {
    return ActiveConnectionItem(
      id: id ?? this.id,
      peerId: peerId ?? this.peerId,
      peerName: peerName ?? this.peerName,
      platform: platform ?? this.platform,
      routeType: routeType ?? this.routeType,
      sessionDurationSeconds:
          sessionDurationSeconds ?? this.sessionDurationSeconds,
      rxBytes: rxBytes ?? this.rxBytes,
      txBytes: txBytes ?? this.txBytes,
      latencyMs: latencyMs ?? this.latencyMs,
      packetLossPct: packetLossPct ?? this.packetLossPct,
      connectedAt: connectedAt ?? this.connectedAt,
      qualityScore: qualityScore ?? this.qualityScore,
      tunnelIp: tunnelIp ?? this.tunnelIp,
      cipherSuite: cipherSuite ?? this.cipherSuite,
    );
  }
}

class DiscoveredProvider {
  final String id;
  final String zoopId;
  final String name;
  final String platform;
  final bool isOnline;
  final double trustScore;
  final int bandwidthCapacityMbps;
  final int latencyMs;
  final String pricingType;
  final List<String> routingCapabilities;
  final String location;
  final bool isVerified;
  final String publicKey;

  const DiscoveredProvider({
    required this.id,
    required this.zoopId,
    required this.name,
    required this.platform,
    required this.isOnline,
    required this.trustScore,
    required this.bandwidthCapacityMbps,
    required this.latencyMs,
    required this.pricingType,
    required this.routingCapabilities,
    required this.location,
    required this.isVerified,
    required this.publicKey,
  });
}
