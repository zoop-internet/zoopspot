import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/phone_utils.dart';
import 'payment_brand_icon.dart';

class WithdrawSheet extends StatefulWidget {
  final double availableAmount;
  final void Function({
    required double amount,
    required String phoneNumber,
    required String provider,
  }) onConfirm;

  const WithdrawSheet({
    super.key,
    required this.availableAmount,
    required this.onConfirm,
  });

  @override
  State<WithdrawSheet> createState() => _WithdrawSheetState();
}

class _WithdrawSheetState extends State<WithdrawSheet> {
  final TextEditingController _phoneController = TextEditingController(text: '+256 ');
  late double _withdrawAmount;
  bool _isReviewing = false;
  int _selectedPercent = 100;
  String _selectedProvider = 'MTN Mobile Money';

  static const double _transferFee = 500.0; // UGX 500 standard telecom transfer fee

  @override
  void initState() {
    super.initState();
    _withdrawAmount = widget.availableAmount;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  String _formatUgx(double amount) {
    return 'UGX ${amount.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        )}';
  }

  void _setPercent(int percent) {
    setState(() {
      _selectedPercent = percent;
      _withdrawAmount = (widget.availableAmount * percent / 100);
    });
  }

  void _onPhoneChanged(String val) {
    final net = PhoneUtils.detectUgandaNetwork(val);
    if (net == 'mtn' && !_selectedProvider.contains('MTN')) {
      setState(() => _selectedProvider = 'MTN Mobile Money');
    } else if (net == 'airtel' && !_selectedProvider.contains('Airtel')) {
      setState(() => _selectedProvider = 'Airtel Money');
    }
  }

  @override
  Widget build(BuildContext context) {
    final netPayout = (_withdrawAmount - _transferFee) > 0 ? (_withdrawAmount - _transferFee) : 0.0;

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
                  'Available balance: ${_formatUgx(widget.availableAmount)}',
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
                    'Withdrawing: ${_formatUgx(_withdrawAmount)}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                const Text(
                  'RECEIVING MOBILE NETWORK',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: ZoopColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),

                Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        label: 'MTN Mobile Money ${_selectedProvider.contains("MTN") ? ", selected" : ""}',
                        button: true,
                        child: InkWell(
                          onTap: () => setState(() => _selectedProvider = 'MTN Mobile Money'),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            constraints: const BoxConstraints(minHeight: 48),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            decoration: BoxDecoration(
                              color: _selectedProvider.contains('MTN')
                                  ? const Color(0xFFFFCC00).withValues(alpha: 0.15)
                                  : ZoopColors.background,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _selectedProvider.contains('MTN')
                                    ? const Color(0xFFFFCC00)
                                    : ZoopColors.surfaceBorder,
                                width: _selectedProvider.contains('MTN') ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const PaymentBrandIcon.mtn(size: 22, borderRadius: 5),
                                const SizedBox(width: 8),
                                const Text(
                                  'MTN Mobile Money',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: ZoopColors.textPrimary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Semantics(
                        label: 'Airtel Money ${_selectedProvider.contains("Airtel") ? ", selected" : ""}',
                        button: true,
                        child: InkWell(
                          onTap: () => setState(() => _selectedProvider = 'Airtel Money'),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            constraints: const BoxConstraints(minHeight: 48),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            decoration: BoxDecoration(
                              color: _selectedProvider.contains('Airtel')
                                  ? const Color(0xFFFF2020).withValues(alpha: 0.15)
                                  : ZoopColors.background,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _selectedProvider.contains('Airtel')
                                    ? const Color(0xFFFF2020)
                                    : ZoopColors.surfaceBorder,
                                width: _selectedProvider.contains('Airtel') ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const PaymentBrandIcon.airtel(size: 22, borderRadius: 5),
                                const SizedBox(width: 8),
                                const Text(
                                  'Airtel Money',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: ZoopColors.textPrimary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                const Text(
                  'RECIPIENT MOBILE MONEY PHONE NUMBER',
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
                    labelText: 'Uganda Phone Number',
                    labelStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                    hintText: '+256 772 000 000',
                    hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                    filled: true,
                    fillColor: ZoopColors.background,
                    prefixIcon: const Icon(Icons.account_balance_wallet_outlined, color: ZoopColors.accentGreen, size: 20),
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
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (_withdrawAmount < 1000 || _phoneController.text.trim().length < 9)
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
                      'REVIEW WITHDRAWAL (${_formatUgx(_withdrawAmount)})',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
                  ),
                ),
              ] else ...[
                // Confirmation Step
                Row(
                  children: [
                    Semantics(
                      label: 'Back to edit withdrawal details',
                      button: true,
                      child: IconButton(
                        icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary, size: 20),
                        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                        onPressed: () => setState(() => _isReviewing = false),
                      ),
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
                      _buildSummaryRow('Gross Withdrawal', _formatUgx(_withdrawAmount)),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Disbursement Rail', _selectedProvider),
                      const SizedBox(height: 10),
                      _buildSummaryRow(
                        'Recipient Phone',
                        PhoneUtils.formatUgandaPhone(_phoneController.text.trim()),
                      ),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Network', _selectedProvider.contains('MTN') ? 'MTN MoMo Direct' : 'Airtel Money Direct'),
                      const SizedBox(height: 10),
                      _buildSummaryRow('Transfer Fee', _formatUgx(_transferFee)),
                      const Divider(height: 24, color: ZoopColors.surfaceBorder),
                      _buildSummaryRow('Net Credited to SIM', _formatUgx(netPayout), isTotal: true),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: ZoopColors.accentGreen.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle_outline, color: ZoopColors.accentGreen, size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Funds will be disbursed directly to your mobile money wallet. Processing typically takes less than 60 seconds.',
                          style: TextStyle(fontSize: 11, color: ZoopColors.textPrimary),
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
                      final phone = PhoneUtils.formatUgandaPhone(_phoneController.text.trim());
                      final provider = _selectedProvider.contains('MTN') ? 'mtn' : 'airtel';
                      widget.onConfirm(
                        amount: _withdrawAmount,
                        phoneNumber: phone,
                        provider: provider,
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
                      'CONFIRM & DISBURSE ${_formatUgx(netPayout)}',
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
