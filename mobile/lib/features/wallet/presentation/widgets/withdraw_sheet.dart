import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

class WithdrawSheet extends StatefulWidget {
  final double availableAmount;
  final void Function(double amount, String destination) onConfirm;

  const WithdrawSheet({
    super.key,
    required this.availableAmount,
    required this.onConfirm,
  });

  @override
  State<WithdrawSheet> createState() => _WithdrawSheetState();
}

class _WithdrawSheetState extends State<WithdrawSheet> {
  final TextEditingController _destController = TextEditingController();
  late double _withdrawAmount;

  @override
  void initState() {
    super.initState();
    _withdrawAmount = widget.availableAmount;
  }

  @override
  void dispose() {
    _destController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Withdraw Provider Earnings',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: ZoopColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Available for withdrawal: \$${widget.availableAmount.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: ZoopColors.accentGreen, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _destController,
                style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'USDC Address or Lightning Invoice',
                  labelStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                  hintText: '0x... or lnbc...',
                  hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: ZoopColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final dest = _destController.text.trim().isEmpty
                        ? '0xWallet...default'
                        : _destController.text.trim();
                    widget.onConfirm(_withdrawAmount, dest);
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.accentGreen,
                    foregroundColor: ZoopColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'WITHDRAW \$${_withdrawAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
