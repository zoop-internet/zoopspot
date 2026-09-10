/// Utility class for formatting and detecting Uganda telecom providers.
class PhoneUtils {
  PhoneUtils._();

  /// Formats raw Uganda phone number into standardized E.164 (+256...)
  static String formatUgandaPhone(String input) {
    String cleaned = input.replaceAll(RegExp(r'[\s\-()]'), '').trim();
    if (cleaned.startsWith('0')) {
      cleaned = '+256${cleaned.substring(1)}';
    } else if (cleaned.startsWith('256')) {
      cleaned = '+$cleaned';
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+256$cleaned';
    }
    return cleaned;
  }

  /// Detects whether a Uganda phone number belongs to MTN or Airtel
  static String detectUgandaNetwork(String phoneNumber) {
    final formatted = formatUgandaPhone(phoneNumber);
    if (formatted.length >= 6) {
      final prefix = formatted.substring(4, 6);
      if (const ['77', '78', '76', '39'].contains(prefix)) {
        return 'mtn';
      }
      if (const ['70', '75', '74'].contains(prefix)) {
        return 'airtel';
      }
    }
    return 'unknown';
  }
}
