import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/phone_utils.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_button.dart';
import '../../domain/wallet_models.dart';
import 'payment_brand_icon.dart';

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
      'type': PaymentMethodType.mtnMobileMoney,
      'name': 'MTN Mobile Money',
      'color': const Color(0xFFFFCC00),
      'subtitle': 'Instant USSD push prompt on your MTN SIM (+256 77/78/76)',
    },
    {
      'id': 'airtel',
      'type': PaymentMethodType.airtelMoney,
      'name': 'Airtel Money',
      'color': const Color(0xFFE40000),
      'subtitle': 'Instant USSD push prompt on your Airtel SIM (+256 70/75/74)',
    },
    {
      'id': 'card',
      'type': PaymentMethodType.card,
      'name': 'Debit / Credit Card',
      'color': ZoopColors.primaryCyan,
      'subtitle': 'Visa & Mastercard secure card checkout',
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
    final net = PhoneUtils.detectUgandaNetwork(val);
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
                  'Top-Up Zoop Wallet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Deposit funds instantly via Card, MTN Mobile Money, or Airtel Money.',
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
                      return Semantics(
                        selected: isSelected,
                        button: true,
                        label: 'Preset top-up amount ${_formatUgx(amount)}',
                        child: ChoiceChip(
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
                              ZoopFeedback.selection();
                              setState(() {
                                _isCustomAmount = false;
                                _selectedAmount = amount;
                              });
                            }
                          },
                        ),
                      );
                    }),
                    Semantics(
                      selected: _isCustomAmount,
                      button: true,
                      label: 'Custom deposit amount',
                      child: ChoiceChip(
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
                          ZoopFeedback.selection();
                          setState(() => _isCustomAmount = selected);
                        },
                      ),
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
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Material(
                      color: ZoopColors.surfaceElevated,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? methodColor : ZoopColors.surfaceBorder,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: ListTile(
                        dense: true,
                        leading: PaymentBrandIcon(
                          method: method['type'] as PaymentMethodType,
                          size: 36,
                          borderRadius: 8,
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
                        onTap: () {
                          ZoopFeedback.selection();
                          setState(() => _selectedMethod = method['name'] as String);
                        },
                      ),
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
                      suffixIcon: Builder(
                        builder: (context) {
                          final net = PhoneUtils.detectUgandaNetwork(_phoneController.text);
                          if (net == 'mtn') {
                            return Container(
                              margin: const EdgeInsets.all(8),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFCC00).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle, size: 14, color: Color(0xFFFFCC00)),
                                  SizedBox(width: 4),
                                  Text('MTN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFFFCC00))),
                                ],
                              ),
                            );
                          } else if (net == 'airtel') {
                            return Container(
                              margin: const EdgeInsets.all(8),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE40000).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle, size: 14, color: Color(0xFFE40000)),
                                  SizedBox(width: 4),
                                  Text('Airtel', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFE40000))),
                                ],
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
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
                ZoopButton.primary(
                  label: 'REVIEW TOP-UP (${_formatUgx(_selectedAmount)})',
                  isFullWidth: true,
                  onPressed: () {
                    if (_selectedAmount < 500) {
                      ZoopFeedback.vibrate();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Minimum deposit is UGX 500'),
                          backgroundColor: ZoopColors.accentRose,
                        ),
                      );
                      return;
                    }
                    if (_isMobileMoney && _phoneController.text.trim().length < 9) {
                      ZoopFeedback.vibrate();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please enter a valid Uganda phone number'),
                          backgroundColor: ZoopColors.accentRose,
                        ),
                      );
                      return;
                    }
                    ZoopFeedback.medium();
                    setState(() => _isReviewing = true);
                  },
                ),
              ] else ...[
                // Review & Confirmation Screen
                Row(
                  children: [
                    Semantics(
                      label: 'Back to edit top-up details',
                      button: true,
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary, size: 20),
                        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                        onPressed: () => setState(() => _isReviewing = false),
                      ),
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
                          PhoneUtils.formatUgandaPhone(_phoneController.text.trim()),
                        ),
                      ],
                      const SizedBox(height: 10),
                      _buildSummaryRow('Channel', _isMobileMoney ? 'Direct Telecom Push' : 'Secure Card Gateway'),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Telecom Network Fee', 'UGX 0 (Covered by Zoop)'),
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
                              : 'You will be redirected to the secure checkout page to complete your card payment.',
                          style: const TextStyle(fontSize: 11, color: ZoopColors.textPrimary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ZoopButton.primary(
                  label: 'CONFIRM & PAY ${_formatUgx(_selectedAmount)}',
                  isFullWidth: true,
                  onPressed: () {
                    ZoopFeedback.medium();
                    final phone = _isMobileMoney
                        ? PhoneUtils.formatUgandaPhone(_phoneController.text.trim())
                        : null;
                    widget.onConfirm(
                      amount: _selectedAmount,
                      method: _selectedMethod,
                      phoneNumber: phone,
                    );
                    Navigator.of(context).pop();
                  },
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: () {
                      ZoopFeedback.selection();
                      setState(() => _isReviewing = false);
                    },
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
