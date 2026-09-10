import 'package:flutter/material.dart';
import '../theme/zoop_colors.dart';
import '../theme/zoop_spacing.dart';
import '../theme/zoop_typography.dart';

/// Canonical Zoop Form Text Field Component.
/// Adheres to dark slate surface themes, high-contrast typography, and accessible touch targets.
class ZoopTextInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? initialValue;
  final String? labelText;
  final String? hintText;
  final String? helperText;
  final String? errorText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final bool autofocus;
  final bool enabled;
  final TextInputType keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;
  final FormFieldValidator<String>? validator;
  final int maxLines;

  const ZoopTextInput({
    super.key,
    this.controller,
    this.initialValue,
    this.labelText,
    this.hintText,
    this.helperText,
    this.errorText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.autofocus = false,
    this.enabled = true,
    this.keyboardType = TextInputType.text,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.validator,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    Widget? trailingWidget = suffixIcon;
    if (trailingWidget == null && onClear != null) {
      trailingWidget = IconButton(
        icon: const Icon(Icons.clear, size: 18, color: ZoopColors.textMuted),
        onPressed: onClear,
        splashRadius: 20,
      );
    }

    return TextFormField(
      controller: controller,
      initialValue: initialValue,
      obscureText: obscureText,
      autofocus: autofocus,
      enabled: enabled,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      onChanged: onChanged,
      onFieldSubmitted: onSubmitted,
      validator: validator,
      maxLines: maxLines,
      style: ZoopTypography.bodyLarge.copyWith(
        color: enabled ? ZoopColors.textPrimary : ZoopColors.textMuted,
      ),
      cursorColor: ZoopColors.primaryCyan,
      decoration: InputDecoration(
        labelText: labelText,
        labelStyle: ZoopTypography.body.copyWith(color: ZoopColors.textMuted),
        floatingLabelStyle: ZoopTypography.body.copyWith(
          color: errorText != null ? ZoopColors.accentRose : ZoopColors.primaryCyan,
          fontWeight: FontWeight.bold,
        ),
        hintText: hintText,
        hintStyle: ZoopTypography.body.copyWith(color: ZoopColors.textMuted),
        helperText: helperText,
        helperStyle: ZoopTypography.bodySmall,
        errorText: errorText,
        errorStyle: ZoopTypography.bodySmall.copyWith(color: ZoopColors.accentRose),
        prefixIcon: prefixIcon,
        suffixIcon: trailingWidget,
        filled: true,
        fillColor: enabled ? ZoopColors.surfaceElevated : ZoopColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: const BorderSide(color: ZoopColors.surfaceBorder, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: const BorderSide(color: ZoopColors.surfaceBorder, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: const BorderSide(color: ZoopColors.primaryCyan, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: const BorderSide(color: ZoopColors.accentRose, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: const BorderSide(color: ZoopColors.accentRose, width: 1.5),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: ZoopSpacing.radiusMd,
          borderSide: BorderSide(color: ZoopColors.surfaceBorder.withValues(alpha: 0.3), width: 1.0),
        ),
      ),
    );
  }
}
