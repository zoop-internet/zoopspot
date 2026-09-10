import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'zoop_colors.dart';

/// Centralized Zoop Typography Tokens.
/// Pairs geometric sans (Inter) for copy/headers with JetBrains Mono for
/// cryptographic keys, IP endpoints, telemetry, and network protocol data.
abstract class ZoopTypography {
  static bool get _isTest {
    try {
      final binding = WidgetsBinding.instance;
      return binding.runtimeType.toString().contains('Test');
    } catch (_) {
      return false;
    }
  }

  static TextStyle _inter({
    required double fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
  }) {
    if (_isTest) {
      return TextStyle(
        fontFamily: 'Inter',
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    }
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  static TextStyle _mono({
    required double fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? letterSpacing,
    double? height,
  }) {
    if (_isTest) {
      return TextStyle(
        fontFamily: 'JetBrainsMono',
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        height: height,
      );
    }
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  // Headings
  static TextStyle get hero => _inter(
        fontSize: 32,
        fontWeight: FontWeight.w900,
        color: ZoopColors.textPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get h1 => _inter(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: ZoopColors.textPrimary,
        letterSpacing: -0.4,
      );

  static TextStyle get h2 => _inter(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: ZoopColors.textPrimary,
        letterSpacing: -0.3,
      );

  static TextStyle get h3 => _inter(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: ZoopColors.textPrimary,
      );

  static TextStyle get title => _inter(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: ZoopColors.textPrimary,
      );

  // Body
  static TextStyle get bodyLarge => _inter(
        fontSize: 15,
        fontWeight: FontWeight.normal,
        color: ZoopColors.textPrimary,
        height: 1.4,
      );

  static TextStyle get body => _inter(
        fontSize: 13,
        fontWeight: FontWeight.normal,
        color: ZoopColors.textSecondary,
        height: 1.4,
      );

  static TextStyle get bodySmall => _inter(
        fontSize: 11,
        fontWeight: FontWeight.normal,
        color: ZoopColors.textMuted,
        height: 1.3,
      );

  // Labels & Actions
  static TextStyle get label => _inter(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: ZoopColors.textSecondary,
        letterSpacing: 0.2,
      );

  static TextStyle get labelSmall => _inter(
        fontSize: 10,
        fontWeight: FontWeight.bold,
        color: ZoopColors.textSecondary,
        letterSpacing: 0.5,
      );

  static TextStyle get button => _inter(
        fontSize: 14,
        fontWeight: FontWeight.bold,
        letterSpacing: 0.3,
      );

  // Technical & Monospace (JetBrains Mono)
  static TextStyle get mono => _mono(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: ZoopColors.primaryCyan,
        letterSpacing: 0.5,
      );

  static TextStyle get monoSmall => _mono(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        color: ZoopColors.textMuted,
        letterSpacing: 0.5,
      );

  static TextStyle get telemetry => _mono(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: ZoopColors.textPrimary,
        letterSpacing: 0.2,
      );

  static TextStyle get hash => _mono(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: ZoopColors.textMuted,
        letterSpacing: 0.5,
      );
}
