/// Standardized currency and points formatting utility.
/// Primary target: East African economies (UGX, KES, RWF, TZS) and Zoop Points.
class CurrencyFormatter {
  CurrencyFormatter._();

  static final RegExp _digitGroupRegex = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');

  /// Formats amount in UGX with proper comma separators, e.g. "UGX 25,000".
  static String formatUgx(num amount) {
    return format(amount, currency: 'UGX');
  }

  /// Formats amount in given currency with thousands comma separators.
  static String format(num amount, {String currency = 'UGX'}) {
    final intVal = amount.round();
    final formatted = intVal.toString().replaceAllMapped(
          _digitGroupRegex,
          (Match m) => '${m[1]},',
        );
    return '$currency $formatted';
  }

  /// Formats Zoop Points (ZP) with comma separators, e.g. "2,500 ZP" or "+45 ZP".
  static String formatPoints(num points, {bool showSign = false}) {
    final intVal = points.round();
    final prefix = (showSign && intVal > 0) ? '+' : '';
    final formatted = intVal.toString().replaceAllMapped(
          _digitGroupRegex,
          (Match m) => '${m[1]},',
        );
    return '$prefix$formatted ZP';
  }

  /// Safely parses user input string containing commas or currency prefixes into double.
  static double parseAmount(String input) {
    if (input.isEmpty) return 0.0;
    final cleaned = input.replaceAll(RegExp(r'[^0-9.]'), '');
    return double.tryParse(cleaned) ?? 0.0;
  }
}
