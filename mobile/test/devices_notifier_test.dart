import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/features/devices/application/devices_notifier.dart';

void main() {
  group('DevicesNotifier Tests', () {
    late DevicesNotifier notifier;

    setUp(() {
      notifier = DevicesNotifier();
    });

    test('Initial state loads devices with online and offline segregation', () {
      final state = notifier.state;
      expect(state.devices.length, equals(4));
      expect(state.onlineDevices.length, equals(3));
      expect(state.offlineDevices.length, equals(1));
    });

    test('Renaming a device updates its name in state', () {
      final dev = notifier.state.devices.first;
      notifier.renameDevice(dev.id, 'My Super Smartphone');

      final updated = notifier.state.devices.firstWhere((d) => d.id == dev.id);
      expect(updated.name, equals('My Super Smartphone'));
    });

    test('Revoking a device removes it from fleet list', () {
      final devId = notifier.state.devices.last.id;
      final initialCount = notifier.state.devices.length;

      notifier.revokeDevice(devId);

      expect(notifier.state.devices.length, equals(initialCount - 1));
      expect(notifier.state.devices.any((d) => d.id == devId), isFalse);
    });
  });
}
