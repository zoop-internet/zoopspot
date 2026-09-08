import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

enum OrgRole {
  owner,
  admin,
  member;

  String get label {
    switch (this) {
      case OrgRole.owner:
        return 'Owner';
      case OrgRole.admin:
        return 'Admin';
      case OrgRole.member:
        return 'Member';
    }
  }

  Color get color {
    switch (this) {
      case OrgRole.owner:
        return ZoopColors.accentAmber;
      case OrgRole.admin:
        return ZoopColors.accentPurple;
      case OrgRole.member:
        return ZoopColors.primaryCyan;
    }
  }
}

class OrganizationItem {
  final String id;
  final String name;
  final String slug;
  final String description;
  final OrgRole role;
  final int memberCount;
  final int deviceCount;
  final String policyName;
  final int monthlyUsageBytes;
  final DateTime joinedAt;

  const OrganizationItem({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.role,
    required this.memberCount,
    required this.deviceCount,
    required this.policyName,
    required this.monthlyUsageBytes,
    required this.joinedAt,
  });

  String get formattedUsage {
    if (monthlyUsageBytes < 1024 * 1024 * 1024) {
      return '${(monthlyUsageBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(monthlyUsageBytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}

class OrgInvitationItem {
  final String id;
  final String orgName;
  final String inviterName;
  final OrgRole role;
  final DateTime expiresAt;

  const OrgInvitationItem({
    required this.id,
    required this.orgName,
    required this.inviterName,
    required this.role,
    required this.expiresAt,
  });
}
