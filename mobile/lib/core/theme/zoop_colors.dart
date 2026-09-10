import 'package:flutter/material.dart';

/// Zoop Design System Color Tokens.
/// Follows the Zoop Mobile Product Experience Specification:
/// Deep dark surfaces with high-contrast cyan, emerald green, and slate tones.
abstract class ZoopColors {
  // Surfaces
  static const Color background = Color(0xFF0B0F19);
  static const Color surface = Color(0xFF111827);
  static const Color surfaceElevated = Color(0xFF1F2937);
  static const Color surfaceBorder = Color(0xFF374151);

  // Accents
  static const Color primaryCyan = Color(0xFF00D2FF);
  static const Color primaryCyanDark = Color(0xFF0284C7);
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentPurple = Color(0xFF8B5CF6);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentRose = Color(0xFFEF4444);

  // Connection State Colors
  static const Color directP2P = Color(0xFF10B981);
  static const Color relay = Color(0xFF8B5CF6);
  static const Color connecting = Color(0xFF00D2FF);
  static const Color roaming = Color(0xFFF59E0B);
  static const Color disconnected = Color(0xFF94A3B8);
  static const Color error = Color(0xFFEF4444);

  // Text (WCAG 2.1 AA certified against dark slate surfaces)
  static const Color textPrimary = Color(0xFFF9FAFB);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF94A3B8);
}

