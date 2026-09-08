import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/sharing/application/sharing_notifier.dart';
import 'package:zoop_mobile/features/sharing/domain/sharing_models.dart';

void main() {
  group('SharingNotifier Tests', () {
    late SharingNotifier notifier;

    setUp(() {
      notifier = SharingNotifier();
    });

    tearDown(() {
      notifier.dispose();
    });

    test('Initial state loads active recipients and pending requests', () {
      final state = notifier.state;
      expect(state.isSharingActive, isTrue);
      expect(state.status, equals(SharingStatus.active));
      expect(state.recipients.length, equals(2));
      expect(state.pendingRequests.length, equals(2));
    });

    test('Toggle master sharing disables and enables sharing state', () {
      notifier.toggleSharing();
      expect(notifier.state.isSharingActive, isFalse);
      expect(notifier.state.status, equals(SharingStatus.disabled));

      notifier.toggleSharing();
      expect(notifier.state.isSharingActive, isTrue);
      expect(notifier.state.status, equals(SharingStatus.active));
    });

    test('Approving an inbound request adds to recipients and removes from queue', () {
      final reqId = notifier.state.pendingRequests.first.id;
      final initialRecipients = notifier.state.recipients.length;

      notifier.approveRequest(reqId);

      expect(notifier.state.recipients.length, equals(initialRecipients + 1));
      expect(notifier.state.pendingRequests.any((r) => r.id == reqId), isFalse);
    });

    test('Rejecting an inbound request removes it without adding recipient', () {
      final reqId = notifier.state.pendingRequests.first.id;
      final initialRecipients = notifier.state.recipients.length;

      notifier.rejectRequest(reqId);

      expect(notifier.state.recipients.length, equals(initialRecipients));
      expect(notifier.state.pendingRequests.any((r) => r.id == reqId), isFalse);
    });

    test('Revoking a recipient removes it from connected list', () {
      final recId = notifier.state.recipients.first.id;
      final initialCount = notifier.state.recipients.length;

      notifier.revokeRecipient(recId);

      expect(notifier.state.recipients.length, equals(initialCount - 1));
      expect(notifier.state.recipients.any((r) => r.id == recId), isFalse);
    });

    test('Updating sharing policy updates state', () {
      const newPolicy = SharingPolicy(
        maxBandwidthMbps: 80,
        dailyDataCapGb: 50.0,
        allowTorExit: true,
        enforceWireguardOnly: true,
      );

      notifier.updatePolicy(newPolicy);

      expect(notifier.state.policy.maxBandwidthMbps, equals(80));
      expect(notifier.state.policy.dailyDataCapGb, equals(50.0));
      expect(notifier.state.policy.allowTorExit, isTrue);
    });
  });
}
