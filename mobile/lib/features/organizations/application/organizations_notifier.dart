import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/organization_models.dart';

class OrganizationsState {
  final List<OrganizationItem> organizations;
  final List<OrgInvitationItem> pendingInvitations;
  final bool isLoading;

  const OrganizationsState({
    this.organizations = const [],
    this.pendingInvitations = const [],
    this.isLoading = false,
  });

  OrganizationsState copyWith({
    List<OrganizationItem>? organizations,
    List<OrgInvitationItem>? pendingInvitations,
    bool? isLoading,
  }) {
    return OrganizationsState(
      organizations: organizations ?? this.organizations,
      pendingInvitations: pendingInvitations ?? this.pendingInvitations,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class OrganizationsNotifier extends StateNotifier<OrganizationsState> {
  OrganizationsNotifier() : super(const OrganizationsState()) {
    _loadInitialData();
  }

  void _loadInitialData() {
    final orgs = [
      OrganizationItem(
        id: 'org-01',
        name: 'Acme Corp Infrastructure',
        slug: 'acme-corp',
        description: 'Internal corporate WireGuard mesh network for engineering.',
        role: OrgRole.admin,
        memberCount: 28,
        deviceCount: 84,
        policyName: 'Strict Direct P2P Only',
        monthlyUsageBytes: 42000000000,
        joinedAt: DateTime.now().subtract(const Duration(days: 90)),
      ),
      OrganizationItem(
        id: 'org-02',
        name: 'Zoop Open Research Lab',
        slug: 'zoop-lab',
        description: 'Decentralized connectivity research community and relay pool.',
        role: OrgRole.member,
        memberCount: 142,
        deviceCount: 310,
        policyName: 'Zero-Knowledge Community Mesh',
        monthlyUsageBytes: 15400000000,
        joinedAt: DateTime.now().subtract(const Duration(days: 30)),
      ),
    ];

    final invites = [
      OrgInvitationItem(
        id: 'inv-01',
        orgName: 'CyberSec Mesh Collective',
        inviterName: 'Marcus Vance (@mvance)',
        role: OrgRole.member,
        expiresAt: DateTime.now().add(const Duration(days: 5)),
      ),
    ];

    state = state.copyWith(organizations: orgs, pendingInvitations: invites);
  }

  void acceptInvitation(String id) {
    final invite = state.pendingInvitations.firstWhere((inv) => inv.id == id);
    final newOrg = OrganizationItem(
      id: 'org-${DateTime.now().millisecondsSinceEpoch}',
      name: invite.orgName,
      slug: invite.orgName.toLowerCase().replaceAll(' ', '-'),
      description: 'Newly joined organization via member invitation.',
      role: invite.role,
      memberCount: 12,
      deviceCount: 24,
      policyName: 'Standard Organization Mesh',
      monthlyUsageBytes: 120000000,
      joinedAt: DateTime.now(),
    );

    final updatedInvites = state.pendingInvitations.where((inv) => inv.id != id).toList();
    state = state.copyWith(
      organizations: [...state.organizations, newOrg],
      pendingInvitations: updatedInvites,
    );
  }

  void declineInvitation(String id) {
    final updated = state.pendingInvitations.where((inv) => inv.id != id).toList();
    state = state.copyWith(pendingInvitations: updated);
  }

  void leaveOrganization(String id) {
    final updated = state.organizations.where((org) => org.id != id).toList();
    state = state.copyWith(organizations: updated);
  }
}

final organizationsProvider =
    StateNotifierProvider<OrganizationsNotifier, OrganizationsState>((ref) {
  return OrganizationsNotifier();
});
