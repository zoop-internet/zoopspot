enum SharingScope {
  personalOnly,
  trustedCircle,
  publicMesh;

  String get label {
    switch (this) {
      case SharingScope.personalOnly:
        return 'Personal Devices Only';
      case SharingScope.trustedCircle:
        return 'Trusted Circle';
      case SharingScope.publicMesh:
        return 'Open Mesh Network';
    }
  }

  String get description {
    switch (this) {
      case SharingScope.personalOnly:
        return 'Only devices linked to your personal Zoop ID';
      case SharingScope.trustedCircle:
        return 'Allowed contacts and verified peer public keys';
      case SharingScope.publicMesh:
        return 'Reciprocal access for any authenticated Zoop node';
    }
  }
}

class RecipientSession {
  final String clientId;
  final String clientName;
  final String clientVirtualIp;
  final DateTime connectedAt;
  final int bytesUploaded;
  final int bytesDownloaded;
  final String platform;

  const RecipientSession({
    required this.clientId,
    required this.clientName,
    required this.clientVirtualIp,
    required this.connectedAt,
    this.bytesUploaded = 0,
    this.bytesDownloaded = 0,
    this.platform = 'android',
  });

  String get formattedUploaded {
    if (bytesUploaded > 1024 * 1024 * 1024) {
      return '${(bytesUploaded / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    return '${(bytesUploaded / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get formattedDownloaded {
    if (bytesDownloaded > 1024 * 1024 * 1024) {
      return '${(bytesDownloaded / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    return '${(bytesDownloaded / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  RecipientSession copyWith({
    int? bytesUploaded,
    int? bytesDownloaded,
  }) {
    return RecipientSession(
      clientId: clientId,
      clientName: clientName,
      clientVirtualIp: clientVirtualIp,
      connectedAt: connectedAt,
      bytesUploaded: bytesUploaded ?? this.bytesUploaded,
      bytesDownloaded: bytesDownloaded ?? this.bytesDownloaded,
      platform: platform,
    );
  }
}

class ProviderSettings {
  final bool isGatewayActive;
  final SharingScope sharingScope;
  final bool pauseOnCellular;
  final bool pauseOnLowBattery;
  final int bandwidthLimitMbps;
  final int totalBytesShared;
  final List<RecipientSession> activeSessions;

  const ProviderSettings({
    this.isGatewayActive = false,
    this.sharingScope = SharingScope.personalOnly,
    this.pauseOnCellular = true,
    this.pauseOnLowBattery = true,
    this.bandwidthLimitMbps = 50,
    this.totalBytesShared = 0,
    this.activeSessions = const [],
  });

  ProviderSettings copyWith({
    bool? isGatewayActive,
    SharingScope? sharingScope,
    bool? pauseOnCellular,
    bool? pauseOnLowBattery,
    int? bandwidthLimitMbps,
    int? totalBytesShared,
    List<RecipientSession>? activeSessions,
  }) {
    return ProviderSettings(
      isGatewayActive: isGatewayActive ?? this.isGatewayActive,
      sharingScope: sharingScope ?? this.sharingScope,
      pauseOnCellular: pauseOnCellular ?? this.pauseOnCellular,
      pauseOnLowBattery: pauseOnLowBattery ?? this.pauseOnLowBattery,
      bandwidthLimitMbps: bandwidthLimitMbps ?? this.bandwidthLimitMbps,
      totalBytesShared: totalBytesShared ?? this.totalBytesShared,
      activeSessions: activeSessions ?? this.activeSessions,
    );
  }

  String get formattedTotalShared {
    if (totalBytesShared > 1024 * 1024 * 1024) {
      return '${(totalBytesShared / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
    }
    return '${(totalBytesShared / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
