/// Abstract contract for device biometrics and hardware credential verification.
abstract class IBiometricAuthService {
  /// Checks if the device has hardware biometrics or device credentials (PIN/pattern) active.
  Future<bool> canAuthenticate();

  /// Prompts the user to authenticate using biometrics (fingerprint/face) or device credentials.
  Future<bool> authenticate({
    String title = 'Zoop Key Security',
    String description = 'Authenticate to access your private recovery phrase',
  });
}
