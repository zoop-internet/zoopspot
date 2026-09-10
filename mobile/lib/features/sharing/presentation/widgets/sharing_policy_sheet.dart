import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../domain/sharing_models.dart';

class SharingPolicySheet extends StatefulWidget {
  final SharingPolicy initialPolicy;
  final ValueChanged<SharingPolicy> onSave;

  const SharingPolicySheet({
    super.key,
    required this.initialPolicy,
    required this.onSave,
  });

  @override
  State<SharingPolicySheet> createState() => _SharingPolicySheetState();
}

class _SharingPolicySheetState extends State<SharingPolicySheet> {
  late double _bandwidthMbps;
  late double _dailyCapGb;
  late bool _allowTor;
  late bool _wireguardOnly;
  late bool _whitelistOnly;

  @override
  void initState() {
    super.initState();
    _bandwidthMbps = widget.initialPolicy.maxBandwidthMbps.toDouble();
    _dailyCapGb = widget.initialPolicy.dailyDataCapGb;
    _allowTor = widget.initialPolicy.allowTorExit;
    _wireguardOnly = widget.initialPolicy.enforceWireguardOnly;
    _whitelistOnly = widget.initialPolicy.whitelistedPeersOnly;
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
              const Row(
                children: [
                  Icon(Icons.tune, color: ZoopColors.primaryCyan, size: 22),
                  SizedBox(width: 10),
                  Text(
                    'Sharing Policy & Limits',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ZoopColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Bandwidth Limit Slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Bandwidth Allocation', style: TextStyle(color: ZoopColors.textPrimary, fontWeight: FontWeight.w600)),
                  Text('${_bandwidthMbps.round()} Mbps', style: const TextStyle(color: ZoopColors.primaryCyan, fontWeight: FontWeight.bold)),
                ],
              ),
              Semantics(
                label: 'Bandwidth Allocation',
                value: '${_bandwidthMbps.round()} megabits per second',
                child: Slider(
                  value: _bandwidthMbps,
                  min: 5,
                  max: 100,
                  divisions: 19,
                  activeColor: ZoopColors.primaryCyan,
                  inactiveColor: ZoopColors.surfaceElevated,
                  onChanged: (v) => setState(() => _bandwidthMbps = v),
                ),
              ),
              const SizedBox(height: 12),
              // Daily Cap Slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Daily Data Quota', style: TextStyle(color: ZoopColors.textPrimary, fontWeight: FontWeight.w600)),
                  Text('${_dailyCapGb.round()} GB / day', style: const TextStyle(color: ZoopColors.accentGreen, fontWeight: FontWeight.bold)),
                ],
              ),
              Semantics(
                label: 'Daily Data Quota',
                value: '${_dailyCapGb.round()} gigabytes per day',
                child: Slider(
                  value: _dailyCapGb,
                  min: 5,
                  max: 100,
                  divisions: 19,
                  activeColor: ZoopColors.accentGreen,
                  inactiveColor: ZoopColors.surfaceElevated,
                  onChanged: (v) => setState(() => _dailyCapGb = v),
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: ZoopColors.surfaceBorder),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: ZoopColors.primaryCyan,
                title: const Text('Enforce WireGuard Only', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary)),
                subtitle: const Text('Disallow unencrypted fallback protocols', style: TextStyle(fontSize: 12, color: ZoopColors.textMuted)),
                value: _wireguardOnly,
                onChanged: (v) => setState(() => _wireguardOnly = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: ZoopColors.primaryCyan,
                title: const Text('Whitelisted Peers Only', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary)),
                subtitle: const Text('Require prior authorization before peer connection', style: TextStyle(fontSize: 12, color: ZoopColors.textMuted)),
                value: _whitelistOnly,
                onChanged: (v) => setState(() => _whitelistOnly = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: ZoopColors.accentPurple,
                title: const Text('Tor Exit Bridging', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary)),
                subtitle: const Text('Allow peers to route Tor onion traffic through this node', style: TextStyle(fontSize: 12, color: ZoopColors.textMuted)),
                value: _allowTor,
                onChanged: (v) => setState(() => _allowTor = v),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    final newPolicy = widget.initialPolicy.copyWith(
                      maxBandwidthMbps: _bandwidthMbps.round(),
                      dailyDataCapGb: _dailyCapGb,
                      allowTorExit: _allowTor,
                      enforceWireguardOnly: _wireguardOnly,
                      whitelistedPeersOnly: _whitelistOnly,
                    );
                    widget.onSave(newPolicy);
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.primaryCyan,
                    foregroundColor: ZoopColors.background,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('SAVE POLICY', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
