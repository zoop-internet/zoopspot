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
  bool _isReviewing = false;
  int _selectedPercent = 100;

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

  void _setPercent(int percent) {
    setState(() {
      _selectedPercent = percent;
      _withdrawAmount = (widget.availableAmount * percent / 100);
    });
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

              if (!_isReviewing) ...[
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
                  'Available balance: \$${widget.availableAmount.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 12, color: ZoopColors.accentGreen, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // Amount Selection Chips
                Row(
                  children: [25, 50, 75, 100].map((pct) {
                    final isSelected = _selectedPercent == pct;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: InkWell(
                          onTap: () => _setPercent(pct),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                                  : ZoopColors.background,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSelected ? ZoopColors.accentGreen : ZoopColors.surfaceBorder,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                pct == 100 ? 'MAX' : '$pct%',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? ZoopColors.accentGreen : ZoopColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    'Withdrawing: \$${_withdrawAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
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
                    onPressed: _withdrawAmount <= 0
                        ? null
                        : () {
                            setState(() => _isReviewing = true);
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.accentGreen,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'REVIEW WITHDRAWAL (\$${_withdrawAmount.toStringAsFixed(2)})',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                  ),
                ),
              ] else ...[
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary, size: 20),
                      onPressed: () => setState(() => _isReviewing = false),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Confirm Withdrawal',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: Column(
                    children: [
                      _buildSummaryRow('Withdraw Amount', '\$${_withdrawAmount.toStringAsFixed(2)}'),
                      const SizedBox(height: 10),
                      _buildSummaryRow(
                        'Destination',
                        _destController.text.trim().isEmpty
                            ? 'Default Linked Payout'
                            : (_destController.text.trim().length > 18
                                ? '${_destController.text.trim().substring(0, 10)}...${_destController.text.trim().substring(_destController.text.trim().length - 6)}'
                                : _destController.text.trim()),
                      ),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Network Payout Fee', '\$0.00 (Zero Fee)'),
                      const Divider(height: 24, color: ZoopColors.surfaceBorder),
                      _buildSummaryRow('Net Settlement', '\$${_withdrawAmount.toStringAsFixed(2)}', isTotal: true),
                    ],
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
                      'CONFIRM & DISPATCH \$${_withdrawAmount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() => _isReviewing = false),
                    child: const Text('Back to Edit', style: TextStyle(color: ZoopColors.textMuted)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 14 : 12,
            color: isTotal ? ZoopColors.textPrimary : ZoopColors.textSecondary,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 12,
            color: isTotal ? ZoopColors.accentGreen : ZoopColors.textPrimary,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
