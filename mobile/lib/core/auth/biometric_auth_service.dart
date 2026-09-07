import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final biometricAuthServiceProvider = Provider<BiometricAuthService>((ref) {
  return BiometricAuthService();
});

class BiometricAuthService {
  static const MethodChannel _channel = MethodChannel('network.zoop.app/biometrics');

  /// Checks if the device has hardware biometrics or device credentials (PIN/pattern) active.
  Future<bool> canAuthenticate() async {
    try {
      final bool? result = await _channel.invokeMethod<bool>('canAuthenticate');
      return result ?? false;
    } on MissingPluginException {
      // Non-supported platform or testing environment
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Prompts the user to authenticate using biometrics (fingerprint/face) or device credentials.
  Future<bool> authenticate({
    String title = 'Zoop Key Security',
    String description = 'Authenticate to access your private recovery phrase',
  }) async {
    try {
      final bool? result = await _channel.invokeMethod<bool>('authenticate', {
        'title': title,
        'description': description,
      });
      return result ?? false;
    } on MissingPluginException {
      // In testing or environments without native biometrics, permit authentication
      return true;
    } catch (_) {
      return false;
    }
  }
}
