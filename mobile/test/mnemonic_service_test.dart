import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/crypto/mnemonic_service.dart';

void main() {
  group('MnemonicService Tests', () {
    test('entropyToMnemonic converts 32-byte entropy to 24 words and roundtrips', () {
      // 32-byte known entropy
      final entropy = List<int>.generate(32, (i) => i * 7 % 256);

      final words = MnemonicService.entropyToMnemonic(entropy);
      expect(words.length, equals(24));

      // All words must exist in wordlist
      for (final word in words) {
        expect(MnemonicService.bip39EnglishWordlist.contains(word), isTrue);
      }

      // Roundtrip
      final restored = MnemonicService.mnemonicToEntropy(words);
      expect(restored, equals(entropy));
    });

    test('validateMnemonic validates correct and corrupted phrases', () {
      final entropy = Uint8List(32); // All zeros
      final words = MnemonicService.entropyToMnemonic(entropy);

      expect(MnemonicService.validateMnemonic(words), isTrue);

      // Tampered word
      final corrupted = List<String>.from(words);
      corrupted[0] = corrupted[0] == 'abandon' ? 'zoo' : 'abandon';
      expect(MnemonicService.validateMnemonic(corrupted), isFalse);

      // Non-existent word
      final invalidWords = List<String>.from(words);
      invalidWords[0] = 'notarealword';
      expect(MnemonicService.validateMnemonic(invalidWords), isFalse);

      // Wrong word count
      expect(MnemonicService.validateMnemonic(words.sublist(0, 23)), isFalse);
    });

    test('entropyToMnemonic throws on invalid entropy length', () {
      expect(
        () => MnemonicService.entropyToMnemonic(List<int>.filled(16, 0)),
        throwsA(isA<MnemonicException>()),
      );
      expect(
        () => MnemonicService.entropyToMnemonic(List<int>.filled(31, 0)),
        throwsA(isA<MnemonicException>()),
      );
    });

    test('mnemonicToEntropy throws on invalid phrase length', () {
      expect(
        () => MnemonicService.mnemonicToEntropy(['abandon', 'abandon']),
        throwsA(isA<MnemonicException>()),
      );
    });
  });
}
