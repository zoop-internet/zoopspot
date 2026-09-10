/// Utility for sanitizing sensitive data (private keys, authorization tokens,
/// cryptographic seeds, and PII) from developer logs, crash reports, and telemetry.
class DataSanitizer {
  DataSanitizer._();

  static final RegExp _bearerRegex = RegExp(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', caseSensitive: false);
  static final RegExp _secretKeyJsonRegex = RegExp(
    r'"(private_key|seed|signature|wireguard_privkey|auth_token|pin)":\s*"[^"]+"',
    caseSensitive: false,
  );

  /// Redacts sensitive patterns from a raw string.
  static String sanitizeString(String input) {
    if (input.isEmpty) return input;
    var result = input;

    // Redact JSON sensitive fields
    result = result.replaceAllMapped(_secretKeyJsonRegex, (match) {
      final field = match.group(1);
      return '"$field": "[REDACTED]"';
    });

    // Redact Bearer tokens
    result = result.replaceAll(_bearerRegex, 'Bearer [REDACTED]');

    return result;
  }

  /// Sanitizes a JSON Map recursively before submission to telemetry or error reporting.
  static Map<String, dynamic> sanitizeMap(Map<String, dynamic> map) {
    final sanitized = <String, dynamic>{};

    for (final entry in map.entries) {
      final key = entry.key.toLowerCase();
      final val = entry.value;

      if (key.contains('secret') ||
          key.contains('private') ||
          key.contains('seed') ||
          key.contains('token') ||
          key.contains('signature') ||
          key.contains('password') ||
          key == 'pin') {
        sanitized[entry.key] = '[REDACTED]';
      } else if (key.contains('phone') && val is String) {
        sanitized[entry.key] = maskPhoneNumber(val);
      } else if (val is Map<String, dynamic>) {
        sanitized[entry.key] = sanitizeMap(val);
      } else if (val is List) {
        sanitized[entry.key] = val.map((item) {
          if (item is Map<String, dynamic>) {
            return sanitizeMap(item);
          } else if (item is String) {
            return sanitizeString(item);
          }
          return item;
        }).toList();
      } else if (val is String) {
        sanitized[entry.key] = sanitizeString(val);
      } else {
        sanitized[entry.key] = val;
      }
    }

    return sanitized;
  }

  /// Masks a phone number showing only prefix and trailing digits, e.g. "+256 77*** **34".
  static String maskPhoneNumber(String phone) {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.length <= 6) return '***';
    final start = digits.substring(0, 4);
    final end = digits.substring(digits.length - 2);
    return '$start*****$end';
  }
}
