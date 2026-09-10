import 'package:flutter/services.dart';

/// Centralized tactile and haptic feedback utility for Zoop Mobile.
/// Follows Nielsen HCI heuristics and platform ergonomics.
class ZoopFeedback {
  ZoopFeedback._();

  /// Light selection click for tabs, chips, and small toggles.
  static Future<void> selection() async {
    try {
      await HapticFeedback.selectionClick();
    } catch (_) {
      // Ignored if platform does not support haptics
    }
  }

  /// Subtle tactile tap for copy actions, toasts, and non-destructive confirmations.
  static Future<void> light() async {
    try {
      await HapticFeedback.lightImpact();
    } catch (_) {
      // Ignored if platform does not support haptics
    }
  }

  /// Firm tactile bump for primary button taps (e.g. Connect, Deposit).
  static Future<void> medium() async {
    try {
      await HapticFeedback.mediumImpact();
    } catch (_) {
      // Ignored if platform does not support haptics
    }
  }

  /// Strong tactile impact for destructive actions (e.g. Revoke, Disconnect, Kill Switch).
  static Future<void> heavy() async {
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {
      // Ignored if platform does not support haptics
    }
  }

  /// Device vibration for errors and warnings.
  static Future<void> vibrate() async {
    try {
      await HapticFeedback.vibrate();
    } catch (_) {
      // Ignored if platform does not support haptics
    }
  }
}
