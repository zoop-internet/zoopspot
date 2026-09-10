import 'package:flutter/material.dart';

/// Zoop Spacing and Layout Grid Tokens.
/// Follows a strict 4dp / 8dp / 12dp / 16dp / 20dp / 24dp / 32dp / 48dp scale.
abstract class ZoopSpacing {
  // Base raw values
  static const double none = 0.0;
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  static const double huge = 48.0;

  // EdgeInsets presets
  static const EdgeInsets paddingZero = EdgeInsets.zero;
  static const EdgeInsets paddingXs = EdgeInsets.all(xs);
  static const EdgeInsets paddingSm = EdgeInsets.all(sm);
  static const EdgeInsets paddingMd = EdgeInsets.all(md);
  static const EdgeInsets paddingLg = EdgeInsets.all(lg);
  static const EdgeInsets paddingXl = EdgeInsets.all(xl);
  static const EdgeInsets paddingXxl = EdgeInsets.all(xxl);

  // Screen and Card presets
  static const EdgeInsets screenPadding =
      EdgeInsets.symmetric(horizontal: xl, vertical: md);
  static const EdgeInsets cardPadding = EdgeInsets.all(lg);
  static const EdgeInsets modalPadding =
      EdgeInsets.fromLTRB(xxl, xl, xxl, xxxl);
  static const EdgeInsets buttonPadding =
      EdgeInsets.symmetric(horizontal: xxl, vertical: md);
  static const EdgeInsets compactButtonPadding =
      EdgeInsets.symmetric(horizontal: md, vertical: sm);

  // SizedBox gap utilities
  static const SizedBox gapXs = SizedBox(width: xs, height: xs);
  static const SizedBox gapSm = SizedBox(width: sm, height: sm);
  static const SizedBox gapMd = SizedBox(width: md, height: md);
  static const SizedBox gapLg = SizedBox(width: lg, height: lg);
  static const SizedBox gapXl = SizedBox(width: xl, height: xl);
  static const SizedBox gapXxl = SizedBox(width: xxl, height: xxl);
  static const SizedBox gapXxxl = SizedBox(width: xxxl, height: xxxl);
  static const SizedBox gapHuge = SizedBox(width: huge, height: huge);

  // BorderRadius presets
  static final BorderRadius radiusXs = BorderRadius.circular(4.0);
  static final BorderRadius radiusSm = BorderRadius.circular(8.0);
  static final BorderRadius radiusMd = BorderRadius.circular(12.0);
  static final BorderRadius radiusLg = BorderRadius.circular(16.0);
  static final BorderRadius radiusXl = BorderRadius.circular(20.0);
  static final BorderRadius radiusXxl = BorderRadius.circular(24.0);
  static final BorderRadius radiusPill = BorderRadius.circular(999.0);
}
