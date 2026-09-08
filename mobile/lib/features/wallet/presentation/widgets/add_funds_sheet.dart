import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

class AddFundsSheet extends StatefulWidget {
  final ValueChanged<double> onConfirm;

  const AddFundsSheet({super.key, required this.onConfirm});

  @override
  State<AddFundsSheet> createState() => _AddFundsSheetState();
}

class _AddFundsSheetState extends State<AddFundsSheet> {
  double _selectedAmount = 25.0;
  String _selectedMethod = 'USDC on Polygon';
  bool _isReviewing = false;

  final List<double> _presets = [10.0, 25.0, 50.0, 100.0];
  final List<Map<String, dynamic>> _methods = [
    {'name': 'USDC on Polygon', 'icon': Icons.currency_bitcoin, 'subtitle': 'Instant, zero gas fees'},
    {'name': 'Bitcoin Lightning', 'icon': Icons.flash_on, 'subtitle': 'Instant micro-settlement'},
    {'name': 'Debit / Credit Card', 'icon': Icons.credit_card, 'subtitle': 'Stripe Connect processing'},
  ];

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
                  'Top-Up Account Balance',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Funds are used automatically when connecting to premium high-speed mesh exit nodes.',
                  style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                ),
                const SizedBox(height: 20),
                // Preset Chips
                Row(
                  children: _presets.map((amount) {
                    final isSelected = _selectedAmount == amount;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: InkWell(
                          onTap: () => setState(() => _selectedAmount = amount),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? ZoopColors.primaryCyan.withValues(alpha: 0.15)
                                  : ZoopColors.background,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? ZoopColors.primaryCyan
                                    : ZoopColors.surfaceBorder,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '\$${amount.toInt()}',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected
                                      ? ZoopColors.primaryCyan
                                      : ZoopColors.textPrimary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                const Text(
                  'PAYMENT METHOD',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: ZoopColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                ..._methods.map((method) {
                  final isSelected = _selectedMethod == method['name'];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? ZoopColors.surfaceElevated
                          : ZoopColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? ZoopColors.primaryCyan
                            : ZoopColors.surfaceBorder,
                      ),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: Icon(method['icon'] as IconData, color: ZoopColors.primaryCyan),
                      title: Text(
                        method['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: ZoopColors.textPrimary, fontSize: 13),
                      ),
                      subtitle: Text(
                        method['subtitle'] as String,
                        style: const TextStyle(color: ZoopColors.textMuted, fontSize: 11),
                      ),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle, color: ZoopColors.primaryCyan, size: 20)
                          : null,
                      onTap: () => setState(() => _selectedMethod = method['name'] as String),
                    ),
                  );
                }),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => setState(() => _isReviewing = true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.primaryCyan,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'REVIEW ORDER (\$${_selectedAmount.toStringAsFixed(2)})',
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
                      'Confirm Top-Up',
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
                      _buildSummaryRow('Top-Up Amount', '\$${_selectedAmount.toStringAsFixed(2)}'),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Payment Method', _selectedMethod),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Network Processing Fee', '\$0.00 (Free)'),
                      const Divider(height: 24, color: ZoopColors.surfaceBorder),
                      _buildSummaryRow('Total Due', '\$${_selectedAmount.toStringAsFixed(2)}', isTotal: true),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      widget.onConfirm(_selectedAmount);
                      Navigator.of(context).pop();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.accentGreen,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'CONFIRM & PAY \$${_selectedAmount.toStringAsFixed(2)}',
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
