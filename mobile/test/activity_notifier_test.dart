import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/activity/application/activity_notifier.dart';
import 'package:zoop_mobile/features/activity/domain/activity_models.dart';

void main() {
  group('ActivityNotifier Tests', () {
    late ActivityNotifier notifier;

    setUp(() {
      notifier = ActivityNotifier();
    });

    test('Initial state loads activity logs', () {
      final state = notifier.state;
      expect(state.events.isNotEmpty, isTrue);
      expect(state.selectedCategory, equals(ActivityCategory.all));
    });

    test('Filtering by category returns only events in that category', () {
      notifier.setCategory(ActivityCategory.connections);
      for (final event in notifier.state.filteredEvents) {
        expect(event.category, equals(ActivityCategory.connections));
      }

      notifier.setCategory(ActivityCategory.sharing);
      for (final event in notifier.state.filteredEvents) {
        expect(event.category, equals(ActivityCategory.sharing));
      }
    });

    test('Clearing logs empties the list', () {
      notifier.clearLogs();
      expect(notifier.state.events.isEmpty, isTrue);
      expect(notifier.state.filteredEvents.isEmpty, isTrue);
    });
  });
}
