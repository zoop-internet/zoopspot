import 'package:flutter/material.dart';
import '../../../../core/network/marzpay_api_client.dart';
import '../../../../core/theme/zoop_colors.dart';

class AddFundsSheet extends StatefulWidget {
  final void Function({
    required double amount,
    required String method,
    String? phoneNumber,
  }) onConfirm;

  const AddFundsSheet({super.key, required this.onConfirm});

  @override
  State<AddFundsSheet> createState() => _AddFundsSheetState();
}

class _AddFundsSheetState extends State<AddFundsSheet> {
  double _selectedAmount = 25000.0;
  final TextEditingController _customAmountController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController(text: '+256 ');
  String _selectedMethod = 'MTN Mobile Money';
  bool _isReviewing = false;
  bool _isCustomAmount = false;

  final List<double> _presets = [5000.0, 10000.0, 25000.0, 50000.0, 100000.0];

  final List<Map<String, dynamic>> _methods = [
    {
      'id': 'mtn',
      'name': 'MTN Mobile Money',
      'icon': Icons.phone_android_rounded,
      'color': Color(0xFFFFCC00),
      'subtitle': 'Instant USSD push prompt on your MTN SIM (+256 77/78/76)',
    },
    {
      'id': 'airtel',
      'name': 'Airtel Money',
      'icon': Icons.phone_android_rounded,
      'color': Color(0xFFFF2020),
      'subtitle': 'Instant USSD push prompt on your Airtel SIM (+256 70/75/74)',
    },
    {
      'id': 'card',
      'name': 'Debit / Credit Card',
      'icon': Icons.credit_card_rounded,
      'color': ZoopColors.primaryCyan,
      'subtitle': 'Visa & Mastercard via secure MarzPay checkout',
    },
  ];

  @override
  void dispose() {
    _customAmountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  bool get _isMobileMoney =>
      _selectedMethod.contains('MTN') || _selectedMethod.contains('Airtel');

  String _formatUgx(double amount) {
    return 'UGX ${amount.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  void _onPhoneChanged(String val) {
    final net = MarzPayApiClient.detectUgandaNetwork(val);
    if (net == 'mtn' && !_selectedMethod.contains('MTN')) {
      setState(() => _selectedMethod = 'MTN Mobile Money');
    } else if (net == 'airtel' && !_selectedMethod.contains('Airtel')) {
      setState(() => _selectedMethod = 'Airtel Money');
    }
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
                  'Top-Up Mesh Wallet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Deposit funds via Card, MTN Mobile Money, or Airtel Money powered by MarzPay.',
                  style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                ),
                const SizedBox(height: 20),

                // Preset Chips
                const Text(
                  'SELECT AMOUNT',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: ZoopColors.textMuted,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ..._presets.map((amount) {
                      final isSelected = !_isCustomAmount && _selectedAmount == amount;
                      return ChoiceChip(
                        label: Text(
                          _formatUgx(amount),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.black : ZoopColors.textPrimary,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: ZoopColors.primaryCyan,
                        backgroundColor: ZoopColors.background,
                        side: BorderSide(
                          color: isSelected ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              _isCustomAmount = false;
                              _selectedAmount = amount;
                            });
                          }
                        },
                      );
                    }),
                    ChoiceChip(
                      label: Text(
                        'Custom',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _isCustomAmount ? Colors.black : ZoopColors.textPrimary,
                        ),
                      ),
                      selected: _isCustomAmount,
                      selectedColor: ZoopColors.primaryCyan,
                      backgroundColor: ZoopColors.background,
                      side: BorderSide(
                        color: _isCustomAmount ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      onSelected: (selected) {
                        setState(() => _isCustomAmount = selected);
                      },
                    ),
                  ],
                ),

                if (_isCustomAmount) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _customAmountController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Amount (UGX)',
                      labelStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                      hintText: 'e.g. 75000',
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
                    onChanged: (val) {
                      final parsed = double.tryParse(val.replaceAll(',', '').trim());
                      if (parsed != null && parsed > 0) {
                        setState(() => _selectedAmount = parsed);
                      }
                    },
                  ),
                ],

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
                  final methodColor = method['color'] as Color;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? ZoopColors.surfaceElevated : ZoopColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? methodColor : ZoopColors.surfaceBorder,
                        width: isSelected ? 1.5 : 1.0,
                      ),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: methodColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(method['icon'] as IconData, color: methodColor, size: 20),
                      ),
                      title: Text(
                        method['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: ZoopColors.textPrimary, fontSize: 13),
                      ),
                      subtitle: Text(
                        method['subtitle'] as String,
                        style: const TextStyle(color: ZoopColors.textMuted, fontSize: 11),
                      ),
                      trailing: isSelected
                          ? Icon(Icons.check_circle, color: methodColor, size: 20)
                          : null,
                      onTap: () => setState(() => _selectedMethod = method['name'] as String),
                    ),
                  );
                }),

                if (_isMobileMoney) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'MOBILE MONEY NUMBER (UGANDA)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: ZoopColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      labelText: 'Handset Phone Number',
                      labelStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                      hintText: '+256 772 000 000',
                      hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                      filled: true,
                      fillColor: ZoopColors.background,
                      prefixIcon: const Icon(Icons.phone_outlined, color: ZoopColors.primaryCyan, size: 20),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                    ),
                    onChanged: _onPhoneChanged,
                  ),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      if (_selectedAmount < 500) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Minimum deposit is UGX 500'),
                            backgroundColor: ZoopColors.accentRose,
                          ),
                        );
                        return;
                      }
                      if (_isMobileMoney && _phoneController.text.trim().length < 9) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Please enter a valid Uganda phone number'),
                            backgroundColor: ZoopColors.accentRose,
                          ),
                        );
                        return;
                      }
                      setState(() => _isReviewing = true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.primaryCyan,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'REVIEW TOP-UP (${_formatUgx(_selectedAmount)})',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                  ),
                ),
              ] else ...[
                // Review & Confirmation Screen
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
                      _buildSummaryRow('Deposit Amount', _formatUgx(_selectedAmount)),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Payment Rail', _selectedMethod),
                      if (_isMobileMoney) ...[
                        const SizedBox(height: 10),
                        _buildSummaryRow(
                          'Recipient Handset',
                          MarzPayApiClient.formatUgandaPhone(_phoneController.text.trim()),
                        ),
                      ],
                      const SizedBox(height: 10),
                      _buildSummaryRow('Processor', 'MarzPay Payments Gateway'),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Processing Fee', 'UGX 0 (Free)'),
                      const Divider(height: 24, color: ZoopColors.surfaceBorder),
                      _buildSummaryRow('Total Due', _formatUgx(_selectedAmount), isTotal: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: ZoopColors.primaryCyan, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _isMobileMoney
                              ? 'A mobile money prompt will be sent to your phone. Approve with your PIN to complete the deposit.'
                              : 'You will be redirected to the secure MarzPay checkout to complete your card payment.',
                          style: const TextStyle(fontSize: 11, color: ZoopColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      final phone = _isMobileMoney
                          ? MarzPayApiClient.formatUgandaPhone(_phoneController.text.trim())
                          : null;
                      widget.onConfirm(
                        amount: _selectedAmount,
                        method: _selectedMethod,
                        phoneNumber: phone,
                      );
                      Navigator.of(context).pop();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.accentGreen,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'CONFIRM & PAY ${_formatUgx(_selectedAmount)}',
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
