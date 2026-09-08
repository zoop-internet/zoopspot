import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum SharingStatus {
  active,
  idle,
  paused,
  disabled;

  String get label {
    switch (this) {
      case SharingStatus.active:
        return 'Sharing Active';
      case SharingStatus.idle:
        return 'Idle (Awaiting Peers)';
      case SharingStatus.paused:
        return 'Temporarily Paused';
      case SharingStatus.disabled:
        return 'Sharing Disabled';
    }
  }

  Color get color {
    switch (this) {
      case SharingStatus.active:
        return ZoopColors.accentGreen;
      case SharingStatus.idle:
        return ZoopColors.primaryCyan;
      case SharingStatus.paused:
        return ZoopColors.accentAmber;
      case SharingStatus.disabled:
        return ZoopColors.textMuted;
    }
  }
}

class ConnectedRecipientItem {
  final String id;
  final String peerZoopId;
  final String name;
  final String platform;
  final DateTime connectedSince;
  final int currentRateKbps;
  final int totalTransferredBytes;
  final String assignedVirtualIp;
  final bool isBlocked;

  const ConnectedRecipientItem({
    required this.id,
    required this.peerZoopId,
    required this.name,
    required this.platform,
    required this.connectedSince,
    required this.currentRateKbps,
    required this.totalTransferredBytes,
    required this.assignedVirtualIp,
    this.isBlocked = false,
  });

  String get formattedDuration {
    final diff = DateTime.now().difference(connectedSince);
    final hours = diff.inHours;
    final minutes = diff.inMinutes % 60;
    if (hours > 0) return '${hours}h ${minutes}m';
    return '${minutes}m ${diff.inSeconds % 60}s';
  }

  String get formattedRate => '$currentRateKbps Kbps';

  String get formattedTransferred {
    if (totalTransferredBytes < 1024 * 1024) {
      return '${(totalTransferredBytes / 1024).toStringAsFixed(1)} KB';
    }
    if (totalTransferredBytes < 1024 * 1024 * 1024) {
      return '${(totalTransferredBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(totalTransferredBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  ConnectedRecipientItem copyWith({
    String? id,
    String? peerZoopId,
    String? name,
    String? platform,
    DateTime? connectedSince,
    int? currentRateKbps,
    int? totalTransferredBytes,
    String? assignedVirtualIp,
    bool? isBlocked,
  }) {
    return ConnectedRecipientItem(
      id: id ?? this.id,
      peerZoopId: peerZoopId ?? this.peerZoopId,
      name: name ?? this.name,
      platform: platform ?? this.platform,
      connectedSince: connectedSince ?? this.connectedSince,
      currentRateKbps: currentRateKbps ?? this.currentRateKbps,
      totalTransferredBytes: totalTransferredBytes ?? this.totalTransferredBytes,
      assignedVirtualIp: assignedVirtualIp ?? this.assignedVirtualIp,
      isBlocked: isBlocked ?? this.isBlocked,
    );
  }
}

class InboundSharingRequestItem {
  final String id;
  final String requesterZoopId;
  final String name;
  final String platform;
  final DateTime requestedAt;
  final double trustScore;
  final int requestedBandwidthMbps;
  final String note;

  const InboundSharingRequestItem({
    required this.id,
    required this.requesterZoopId,
    required this.name,
    required this.platform,
    required this.requestedAt,
    required this.trustScore,
    required this.requestedBandwidthMbps,
    required this.note,
  });
}

class SharingPolicy {
  final int maxBandwidthMbps;
  final double dailyDataCapGb;
  final bool allowTorExit;
  final bool enforceWireguardOnly;
  final bool whitelistedPeersOnly;

  const SharingPolicy({
    this.maxBandwidthMbps = 50,
    this.dailyDataCapGb = 25.0,
    this.allowTorExit = false,
    this.enforceWireguardOnly = true,
    this.whitelistedPeersOnly = false,
  });

  SharingPolicy copyWith({
    int? maxBandwidthMbps,
    double? dailyDataCapGb,
    bool? allowTorExit,
    bool? enforceWireguardOnly,
    bool? whitelistedPeersOnly,
  }) {
    return SharingPolicy(
      maxBandwidthMbps: maxBandwidthMbps ?? this.maxBandwidthMbps,
      dailyDataCapGb: dailyDataCapGb ?? this.dailyDataCapGb,
      allowTorExit: allowTorExit ?? this.allowTorExit,
      enforceWireguardOnly: enforceWireguardOnly ?? this.enforceWireguardOnly,
      whitelistedPeersOnly: whitelistedPeersOnly ?? this.whitelistedPeersOnly,
    );
  }
}
