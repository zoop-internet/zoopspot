import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum ActivityCategory {
  all,
  connections,
  sharing,
  security,
  devices;

  String get label {
    switch (this) {
      case ActivityCategory.all:
        return 'All';
      case ActivityCategory.connections:
        return 'Connections';
      case ActivityCategory.sharing:
        return 'Sharing';
      case ActivityCategory.security:
        return 'Security';
      case ActivityCategory.devices:
        return 'Devices';
    }
  }

  IconData get icon {
    switch (this) {
      case ActivityCategory.all:
        return Icons.list_alt;
      case ActivityCategory.connections:
        return Icons.hub_outlined;
      case ActivityCategory.sharing:
        return Icons.wifi_tethering;
      case ActivityCategory.security:
        return Icons.security;
      case ActivityCategory.devices:
        return Icons.devices;
    }
  }
}

enum ActivitySeverity {
  info,
  success,
  warning,
  error;

  Color get color {
    switch (this) {
      case ActivitySeverity.info:
        return ZoopColors.primaryCyan;
      case ActivitySeverity.success:
        return ZoopColors.accentGreen;
      case ActivitySeverity.warning:
        return ZoopColors.accentAmber;
      case ActivitySeverity.error:
        return ZoopColors.accentRose;
    }
  }
}

class ActivityEventItem {
  final String id;
  final DateTime timestamp;
  final ActivityCategory category;
  final String title;
  final String description;
  final ActivitySeverity severity;
  final Map<String, String> metadata;

  const ActivityEventItem({
    required this.id,
    required this.timestamp,
    required this.category,
    required this.title,
    required this.description,
    required this.severity,
    this.metadata = const {},
  });

  String get relativeTime {
    final diff = DateTime.now().difference(timestamp);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
