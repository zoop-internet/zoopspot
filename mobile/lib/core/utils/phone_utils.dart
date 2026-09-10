/// Utility class for formatting and detecting East Africa telecom providers (Uganda, Kenya, Rwanda, Tanzania).
class PhoneUtils {
  PhoneUtils._();

  /// Formats raw Uganda phone number into standardized E.164 (+256...)
  static String formatUgandaPhone(String input) {
    return formatEastAfricaPhone(input, defaultCountryCode: '256');
  }

  /// Formats raw East Africa phone number into standardized E.164.
  static String formatEastAfricaPhone(String input, {String defaultCountryCode = '256'}) {
    String cleaned = input.replaceAll(RegExp(r'[\s\-()]'), '').trim();
    if (cleaned.startsWith('0')) {
      cleaned = '+$defaultCountryCode${cleaned.substring(1)}';
    } else if (cleaned.startsWith('256') ||
        cleaned.startsWith('254') ||
        cleaned.startsWith('250') ||
        cleaned.startsWith('255')) {
      cleaned = '+$cleaned';
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+$defaultCountryCode$cleaned';
    }
    return cleaned;
  }

  /// Validates whether a phone number matches East African format length.
  static bool isValidEastAfricaPhone(String phoneNumber) {
    final formatted = formatEastAfricaPhone(phoneNumber);
    return RegExp(r'^\+(256|254|250|255)[0-9]{9}$').hasMatch(formatted);
  }

  /// Detects whether a phone number belongs to MTN, Airtel, Safaricom, or Vodacom.
  static String detectUgandaNetwork(String phoneNumber) {
    return detectNetwork(phoneNumber);
  }

  /// Detects East African telecom network operator from E.164 prefix.
  static String detectNetwork(String phoneNumber) {
    final formatted = formatEastAfricaPhone(phoneNumber);
    if (formatted.startsWith('+256') && formatted.length >= 6) {
      final prefix = formatted.substring(4, 6);
      if (const ['77', '78', '76', '39'].contains(prefix)) return 'mtn';
      if (const ['70', '75', '74'].contains(prefix)) return 'airtel';
    } else if (formatted.startsWith('+254') && formatted.length >= 6) {
      final prefix = formatted.substring(4, 6);
      if (const ['70', '71', '72', '79', '11'].contains(prefix)) return 'safaricom';
      if (const ['73', '78'].contains(prefix)) return 'airtel';
    } else if (formatted.startsWith('+250') && formatted.length >= 6) {
      final prefix = formatted.substring(4, 6);
      if (const ['78', '79'].contains(prefix)) return 'mtn';
      if (const ['72', '73'].contains(prefix)) return 'airtel';
    } else if (formatted.startsWith('+255') && formatted.length >= 6) {
      final prefix = formatted.substring(4, 6);
      if (const ['74', '75', '76'].contains(prefix)) return 'vodacom';
      if (const ['78', '68', '69'].contains(prefix)) return 'airtel';
    }
    return 'unknown';
  }
}
