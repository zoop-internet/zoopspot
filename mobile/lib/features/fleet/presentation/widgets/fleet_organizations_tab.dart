import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../organizations/application/organizations_notifier.dart';
import '../../../organizations/domain/organization_models.dart';

/// Tab widget for joined Organizations and pending invites management.
class FleetOrganizationsTab extends StatelessWidget {
  final OrganizationsState state;
  final TextEditingController joinCodeController;
  final VoidCallback onJoinWithCode;
  final ValueChanged<String> onAcceptInvitation;
  final ValueChanged<String> onDeclineInvitation;
  final ValueChanged<OrganizationItem> onShowOrgDetails;

  const FleetOrganizationsTab({
    super.key,
    required this.state,
    required this.joinCodeController,
    required this.onJoinWithCode,
    required this.onAcceptInvitation,
    required this.onDeclineInvitation,
    required this.onShowOrgDetails,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Join with code card
          Container(
            padding: ZoopSpacing.cardPadding,
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'JOIN WITH INVITE CODE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0, color: ZoopColors.textMuted),
                ),
                ZoopSpacing.gapSm,
                Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        label: 'Organization invite code input',
                        child: TextField(
                          controller: joinCodeController,
                          style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'Paste invite token or code...',
                            hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                            filled: true,
                            fillColor: ZoopColors.surfaceElevated,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: ZoopSpacing.radiusMd,
                              borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: ZoopSpacing.radiusMd,
                              borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                            ),
                          ),
                        ),
                      ),
                    ),
                    ZoopSpacing.gapSm,
                    Semantics(
                      label: 'Join organization with invite code',
                      button: true,
                      child: ElevatedButton(
                        onPressed: onJoinWithCode,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.primaryCyan,
                          foregroundColor: Colors.black,
                          minimumSize: const Size(80, 46),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: ZoopSpacing.radiusMd),
                        ),
                        child: const Text('Join', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ZoopSpacing.gapXl,

          // Pending Invitations
          if (state.pendingInvitations.isNotEmpty) ...[
            _buildSectionHeader('PENDING INVITATIONS', ZoopColors.accentAmber),
            ZoopSpacing.gapSm,
            ...state.pendingInvitations.map((invite) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: ZoopSpacing.cardPadding,
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: ZoopSpacing.radiusLg,
                  border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.mail_outline, color: ZoopColors.primaryCyan, size: 20),
                        ),
                        ZoopSpacing.gapMd,
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                invite.orgName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Invited by ${invite.inviterName} • ${invite.role.label}',
                                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    ZoopSpacing.gapLg,
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Semantics(
                          label: 'Decline invitation to join ${invite.orgName}',
                          button: true,
                          child: TextButton(
                            onPressed: () => onDeclineInvitation(invite.id),
                            style: TextButton.styleFrom(
                              minimumSize: const Size(80, 44),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                            child: const Text('Decline', style: TextStyle(color: ZoopColors.textMuted)),
                          ),
                        ),
                        ZoopSpacing.gapSm,
                        Semantics(
                          label: 'Accept invitation to join ${invite.orgName}',
                          button: true,
                          child: ElevatedButton(
                            onPressed: () => onAcceptInvitation(invite.id),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ZoopColors.primaryCyan,
                              foregroundColor: Colors.black,
                              minimumSize: const Size(120, 44),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: ZoopSpacing.radiusMd),
                            ),
                            child: const Text('Accept & Join', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
            ZoopSpacing.gapLg,
          ],

          // Active Organizations
          _buildSectionHeader('ENROLLED ORGANIZATIONS (${state.organizations.length})', ZoopColors.primaryCyan),
          ZoopSpacing.gapSm,
          if (state.organizations.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(36),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: ZoopSpacing.radiusLg,
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: const Column(
                children: [
                  Icon(Icons.corporate_fare, size: 52, color: ZoopColors.textMuted),
                  SizedBox(height: 12),
                  Text(
                    'No Enrolled Organizations',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Join an enterprise network or community mesh to share secure egress policies.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                  ),
                ],
              ),
            )
          else
            ...state.organizations.map((org) {
              return Semantics(
                label: '${org.name}, ${org.deviceCount} nodes, role ${org.role.label}. Double tap to view organization details.',
                button: true,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: ListTile(
                    onTap: () => onShowOrgDetails(org),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                        borderRadius: ZoopSpacing.radiusMd,
                      ),
                      child: const Icon(Icons.business, color: ZoopColors.primaryCyan, size: 20),
                    ),
                    title: Text(org.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text(
                      '${org.deviceCount} nodes • ${org.role.label}',
                      style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                    ),
                    trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: color,
        ),
      ),
    );
  }
}
