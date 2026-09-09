import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

class PinChangeDialog extends StatefulWidget {
  final ValueChanged<String> onPinChanged;

  const PinChangeDialog({super.key, required this.onPinChanged});

  @override
  State<PinChangeDialog> createState() => _PinChangeDialogState();
}

class _PinChangeDialogState extends State<PinChangeDialog> {
  final TextEditingController _pinController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _pinController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _submit() {
    final pin = _pinController.text.trim();
    final confirm = _confirmController.text.trim();

    if (pin.length < 4) {
      setState(() => _error = 'PIN must be at least 4 digits');
      return;
    }
    if (pin != confirm) {
      setState(() => _error = 'PINs do not match');
      return;
    }

    widget.onPinChanged(pin);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: ZoopColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Row(
        children: [
          Icon(Icons.lock_outline, color: ZoopColors.primaryCyan, size: 22),
          SizedBox(width: 8),
          Text(
            'Change Zoop PIN',
            style: TextStyle(color: ZoopColors.textPrimary, fontSize: 18),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Protect local cryptographic secrets and node pairing with a security PIN.',
            style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            obscureText: true,
            maxLength: 6,
            style: const TextStyle(color: ZoopColors.textPrimary, letterSpacing: 4, fontSize: 18),
            decoration: const InputDecoration(
              labelText: 'New PIN (4-6 digits)',
              labelStyle: TextStyle(color: ZoopColors.textMuted, fontSize: 12),
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmController,
            keyboardType: TextInputType.number,
            obscureText: true,
            maxLength: 6,
            style: const TextStyle(color: ZoopColors.textPrimary, letterSpacing: 4, fontSize: 18),
            decoration: const InputDecoration(
              labelText: 'Confirm New PIN',
              labelStyle: TextStyle(color: ZoopColors.textMuted, fontSize: 12),
              counterText: '',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: ZoopColors.accentRose, fontSize: 12),
            ),
          ],
        ],
      ),
      actions: [
        Semantics(
          button: true,
          label: 'Cancel PIN change',
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: 64),
            child: TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel', style: TextStyle(color: ZoopColors.textSecondary)),
            ),
          ),
        ),
        Semantics(
          button: true,
          label: 'Update PIN',
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: 100),
            child: ElevatedButton(
              onPressed: _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: ZoopColors.primaryCyan,
                foregroundColor: ZoopColors.background,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              child: const Text('Update PIN', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ),
      ],
    );
  }
}
