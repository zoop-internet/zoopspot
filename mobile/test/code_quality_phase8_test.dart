import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Code Quality & Technical Debt Elimination (Phase 8)', () {
    test('Zero Dart files in mobile/lib exceed 800 lines', () {
      final libDir = Directory('lib');
      expect(libDir.existsSync(), isTrue, reason: 'lib directory must exist');

      final dartFiles = libDir
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList();

      expect(dartFiles.isNotEmpty, isTrue);

      final filesExceeding800 = <String, int>{};

      for (final file in dartFiles) {
        final lines = file.readAsLinesSync().length;
        if (lines > 800) {
          filesExceeding800[file.path] = lines;
        }
      }

      expect(
        filesExceeding800,
        isEmpty,
        reason: 'All Dart files in mobile/lib must be <= 800 lines. '
            'Offenders: $filesExceeding800',
      );
    });

    test('All four monolithic screens are under 800 lines', () {
      final targets = [
        'lib/features/sharing/presentation/screens/sharing_screen.dart',
        'lib/features/fleet/presentation/screens/fleet_screen.dart',
        'lib/features/dashboard/presentation/screens/dashboard_screen.dart',
        'lib/features/wallet/presentation/screens/wallet_screen.dart',
      ];

      for (final path in targets) {
        final file = File(path);
        expect(file.existsSync(), isTrue, reason: '$path must exist');
        final lineCount = file.readAsLinesSync().length;
        expect(
          lineCount,
          lessThanOrEqualTo(800),
          reason: '$path ($lineCount lines) exceeds 800 lines limit',
        );
      }
    });
  });
}
