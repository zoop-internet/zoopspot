import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/connections/application/connections_notifier.dart';

void main() {
  group('ConnectionsNotifier Tests', () {
    late ConnectionsNotifier notifier;

    setUp(() {
      notifier = ConnectionsNotifier();
    });

    tearDown(() {
      notifier.dispose();
    });

    test('Initial state loads active connections and discovered providers', () {
      final state = notifier.state;
      expect(state.activeConnections.isNotEmpty, isTrue);
      expect(state.discoveredProviders.isNotEmpty, isTrue);
      expect(state.activeConnections.length, equals(2));
      expect(state.discoveredProviders.length, equals(4));
    });

    test('Disconnecting a connection removes it from active list', () {
      final initialCount = notifier.state.activeConnections.length;
      final firstId = notifier.state.activeConnections.first.id;

      notifier.disconnect(firstId);

      expect(notifier.state.activeConnections.length, equals(initialCount - 1));
      expect(notifier.state.activeConnections.any((c) => c.id == firstId), isFalse);
    });

    test('Connecting to provider adds new active connection', () {
      final provider = notifier.state.discoveredProviders.first;
      final countBefore = notifier.state.activeConnections.length;

      notifier.connectToProvider(provider);

      expect(notifier.state.activeConnections.length, equals(countBefore + 1));
      expect(notifier.state.activeConnections.any((c) => c.peerId == provider.zoopId), isTrue);
    });

    test('Search filter properly filters active connections and providers', () {
      notifier.setSearchQuery('Berlin');
      expect(notifier.state.filteredActiveConnections.length, equals(1));
      expect(notifier.state.filteredActiveConnections.first.peerName.contains('Berlin'), isTrue);

      notifier.setSearchQuery('Frankfurt');
      expect(notifier.state.filteredDiscoveredProviders.length, equals(1));
      expect(notifier.state.filteredDiscoveredProviders.first.location.contains('Frankfurt'), isTrue);
    });
  });
}
