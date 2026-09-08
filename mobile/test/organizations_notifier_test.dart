import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/organizations/application/organizations_notifier.dart';

void main() {
  group('OrganizationsNotifier Tests', () {
    late OrganizationsNotifier notifier;

    setUp(() {
      notifier = OrganizationsNotifier();
    });

    test('Initial state loads enrolled organizations and pending invitations', () {
      final state = notifier.state;
      expect(state.organizations.length, equals(2));
      expect(state.pendingInvitations.length, equals(1));
    });

    test('Accepting invitation enrolls organization and removes invite', () {
      final inviteId = notifier.state.pendingInvitations.first.id;
      final orgCountBefore = notifier.state.organizations.length;

      notifier.acceptInvitation(inviteId);

      expect(notifier.state.organizations.length, equals(orgCountBefore + 1));
      expect(notifier.state.pendingInvitations.isEmpty, isTrue);
    });

    test('Declining invitation removes invite without adding organization', () {
      final inviteId = notifier.state.pendingInvitations.first.id;
      final orgCountBefore = notifier.state.organizations.length;

      notifier.declineInvitation(inviteId);

      expect(notifier.state.organizations.length, equals(orgCountBefore));
      expect(notifier.state.pendingInvitations.isEmpty, isTrue);
    });

    test('Leaving organization removes it from list', () {
      final orgId = notifier.state.organizations.first.id;
      final countBefore = notifier.state.organizations.length;

      notifier.leaveOrganization(orgId);

      expect(notifier.state.organizations.length, equals(countBefore - 1));
      expect(notifier.state.organizations.any((o) => o.id == orgId), isFalse);
    });
  });
}
