import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_confirm_dialog.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../application/settings_notifier.dart';
import '../../domain/settings_models.dart';
import '../widgets/pin_change_dialog.dart';
import '../widgets/privacy_disclosure_sheet.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _handleKillSwitchToggle(BuildContext context, WidgetRef ref, bool currentValue) async {
    final notifier = ref.read(settingsProvider.notifier);
    if (!currentValue) {
      final confirmed = await ZoopConfirmDialog.show(
        context: context,
        title: 'Enable Emergency Kill Switch?',
        message: 'All device internet traffic will be blocked immediately whenever the VPN tunnel is disconnected. Only enable this if you require strict leak-proof traffic isolation.',
        confirmLabel: 'Enable Kill Switch',
        cancelLabel: 'Cancel',
        isDestructive: true,
        icon: Icons.vpn_lock_rounded,
      );
      if (confirmed) {
        ZoopFeedback.heavy();
        notifier.toggleKillSwitch();
      }
    } else {
      ZoopFeedback.selection();
      notifier.toggleKillSwitch();
    }
  }

  void _showPinDialog(BuildContext context, WidgetRef ref) {
    ZoopFeedback.selection();
    showDialog(
      context: context,
      builder: (ctx) => PinChangeDialog(
        onPinChanged: (newPin) {
          ZoopFeedback.light();
          ref.read(settingsProvider.notifier).setPin(newPin);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Zoop PIN updated successfully'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
        },
      ),
    );
  }

  void _showPrivacySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const PrivacyDisclosureSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final identityState = ref.watch(identityNotifierProvider);
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);

    final zoopId = identityState.zoopId ?? 'ZP-UNREGISTERED';

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        leading: Semantics(
          label: 'Back',
          button: true,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary),
              onPressed: () => Navigator.of(context).pop(),
              tooltip: 'Back',
            ),
          ),
        ),
        title: const Row(
          children: [
            Icon(Icons.settings_outlined, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Settings & Security',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 0. Navigation — informational tile
              _buildSectionHeader('NAVIGATION'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: const Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.all(Radius.circular(16)),
                  child: ListTile(
                    leading: Icon(Icons.apps, color: ZoopColors.primaryCyan, size: 22),
                    title: Text(
                      'App Hubs',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                    ),
                    subtitle: Text(
                      'Home, Share, Fleet, and Wallet are accessible from the bottom navigation bar',
                      style: TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 1. Identity & Account Card
              _buildSectionHeader('IDENTITY & ACCOUNT'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: ZoopColors.surfaceElevated,
                          child: Icon(Icons.fingerprint, color: ZoopColors.primaryCyan),
                        ),
                        title: const Text('Permanent Zoop ID', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                        subtitle: Text(zoopId, style: const TextStyle(fontSize: 12, color: ZoopColors.primaryCyan, fontFamily: 'monospace')),
                        trailing: Semantics(
                          button: true,
                          label: 'Copy Zoop ID to clipboard',
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                            child: IconButton(
                              icon: const Icon(Icons.copy, size: 18, color: ZoopColors.textSecondary),
                              tooltip: 'Copy Zoop ID',
                              onPressed: () {
                                ZoopFeedback.light();
                                Clipboard.setData(ClipboardData(text: zoopId));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Zoop ID copied to clipboard'),
                                    backgroundColor: ZoopColors.accentGreen,
                                    duration: Duration(seconds: 1),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      const ListTile(
                        leading: Icon(Icons.cloud_done, color: ZoopColors.accentGreen, size: 22),
                        title: Text('Control Server', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: Text('Frankfurt Control Plane (Active)', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        trailing: Text('ONLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ZoopColors.accentGreen)),
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      Semantics(
                        button: true,
                        label: 'Identity & Seed Recovery. View seed phrase and cryptographic keys.',
                        child: ListTile(
                          leading: const Icon(Icons.key, color: ZoopColors.accentAmber, size: 22),
                          title: const Text('Identity & Seed Recovery', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                          subtitle: const Text('View seed phrase and cryptographic keys', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                          trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                          onTap: () {
                            ZoopFeedback.selection();
                            context.push('/identity');
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 2. Security & Cryptography
              _buildSectionHeader('SECURITY & CRYPTOGRAPHY'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.lock_outline, color: ZoopColors.primaryCyan, size: 22),
                        title: const Text('Zoop Security PIN', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: Text(settings.hasPinSet ? 'PIN protection active' : 'No PIN configured', style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        trailing: Semantics(
                          button: true,
                          label: settings.hasPinSet ? 'Change Zoop security PIN' : 'Set Zoop security PIN',
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                            child: TextButton(
                              onPressed: () => _showPinDialog(context, ref),
                              child: Text(settings.hasPinSet ? 'Change' : 'Set PIN', style: const TextStyle(color: ZoopColors.primaryCyan, fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ),
                        ),
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.security, color: ZoopColors.accentGreen, size: 22),
                        title: const Text('Biometric Authentication', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Require Face Unlock / Fingerprint on launch', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.biometricsEnabled,
                        activeThumbColor: ZoopColors.accentGreen,
                        onChanged: (_) {
                          ZoopFeedback.selection();
                          notifier.toggleBiometrics();
                        },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 3. Network & Routing
              _buildSectionHeader('NETWORK & WIREGUARD'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      SwitchListTile(
                        secondary: const Icon(Icons.vpn_lock, color: ZoopColors.accentRose, size: 22),
                        title: const Text('Kill Switch', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Block all internet traffic if the tunnel disconnects', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.killSwitchEnabled,
                        activeThumbColor: ZoopColors.accentRose,
                        onChanged: (_) => _handleKillSwitchToggle(context, ref, settings.killSwitchEnabled),
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      ListTile(
                        leading: const Icon(Icons.tune, color: ZoopColors.primaryCyan, size: 22),
                        title: const Text('MTU Clamping', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: Text('${settings.mtuClamping} bytes (optimal for carrier networks)', style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text('${settings.mtuClamping}', style: const TextStyle(color: ZoopColors.primaryCyan, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 4. Carrier Zero-Balance Mode
              _buildSectionHeader('CARRIER BYPASS'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: settings.zeroBalanceEnabled
                        ? ZoopColors.accentAmber.withAlpha(128)
                        : ZoopColors.surfaceBorder,
                  ),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      SwitchListTile(
                        secondary: const Icon(Icons.signal_cellular_off, color: ZoopColors.accentAmber, size: 22),
                        title: const Text('Carrier Zero-Balance Mode', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Bypass carrier data gates via SNI relay — receive sharing with 0 MB balance', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.zeroBalanceEnabled,
                        activeThumbColor: ZoopColors.accentAmber,
                        onChanged: (_) {
                          ZoopFeedback.selection();
                          notifier.toggleZeroBalance();
                        },
                      ),
                      if (settings.zeroBalanceEnabled) ...[
                        const Divider(color: ZoopColors.surfaceBorder, height: 1),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Row(
                            children: [
                              const Icon(Icons.sim_card, color: ZoopColors.primaryCyan, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Your Carrier', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                                    const Text('Select your SIM carrier for zero-rated domain matching', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                                  ],
                                ),
                              ),
                              DropdownButton<String>(
                                value: settings.zeroBalanceCarrier,
                                dropdownColor: ZoopColors.surfaceElevated,
                                underline: const SizedBox.shrink(),
                                style: const TextStyle(color: ZoopColors.primaryCyan, fontSize: 12, fontWeight: FontWeight.bold),
                                icon: const Icon(Icons.expand_more, color: ZoopColors.textSecondary, size: 18),
                                items: kKnownCarriers.map((c) {
                                  return DropdownMenuItem(
                                    value: c.key,
                                    child: Text(c.label, style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 12)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    ZoopFeedback.selection();
                                    notifier.setZeroBalanceCarrier(val);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline, color: ZoopColors.textMuted, size: 14),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'When enabled, connections use TLS port 443 with a zero-rated SNI domain. Direct WireGuard UDP probing is skipped.',
                                  style: TextStyle(fontSize: 10, color: ZoopColors.textMuted),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 5. Privacy & Data Governance
              _buildSectionHeader('PRIVACY & TRANSPARENCY'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      Semantics(
                        button: true,
                        label: 'Zero-Knowledge Guarantee. Inspect what Zoop handles versus what stays private.',
                        child: ListTile(
                          leading: const Icon(Icons.privacy_tip_outlined, color: ZoopColors.accentGreen, size: 22),
                          title: const Text('Zero-Knowledge Guarantee', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                          subtitle: const Text('Inspect what Zoop handles vs what stays private', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                          trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                          onTap: () {
                            ZoopFeedback.selection();
                            _showPrivacySheet(context);
                          },
                        ),
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.analytics_outlined, color: ZoopColors.textSecondary, size: 22),
                        title: const Text('Anonymous Diagnostics', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Share anonymized tunnel performance metrics', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.telemetryEnabled,
                        activeThumbColor: ZoopColors.primaryCyan,
                        onChanged: (_) {
                          ZoopFeedback.selection();
                          notifier.toggleTelemetry();
                        },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 6. Notifications
              _buildSectionHeader('NOTIFICATIONS'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Material(
                  color: Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                  child: Column(
                    children: [
                      SwitchListTile(
                        title: const Text('Tunnel State Changes', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Notify when connection drops or reconnects', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.notifyOnConnection,
                        activeThumbColor: ZoopColors.primaryCyan,
                        onChanged: (_) {
                          ZoopFeedback.selection();
                          notifier.toggleNotification('connection');
                        },
                      ),
                      const Divider(color: ZoopColors.surfaceBorder, height: 1),
                      SwitchListTile(
                        title: const Text('Inbound Peer Requests', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('Alert when a peer requests bandwidth sharing', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        value: settings.notifyOnPeerRequest,
                        activeThumbColor: ZoopColors.primaryCyan,
                        onChanged: (_) {
                          ZoopFeedback.selection();
                          notifier.toggleNotification('peerRequest');
                        },
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 7. About & Diagnostics
              _buildSectionHeader('ABOUT ZOOP'),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    _buildAboutRow('Mobile Client Version', 'v1.0.0+1 (rc3)'),
                    const SizedBox(height: 8),
                    _buildAboutRow('WireGuard Core Engine', 'WireGuard-Go v0.5.2'),
                    const SizedBox(height: 8),
                    _buildAboutRow('Cryptographic Enclave', 'Ed25519 + ChaCha20-Poly1305'),
                    const SizedBox(height: 16),
                    // Network Diagnostics shortcut
                    Semantics(
                      button: true,
                      label: 'Network Diagnostics. 9-stage probe: STUN, NAT, MTU, DNS.',
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.network_check, color: ZoopColors.accentAmber, size: 22),
                        title: const Text('Network Diagnostics', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                        subtitle: const Text('9-stage probe: STUN, NAT, MTU, DNS', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                        trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                        onTap: () {
                          ZoopFeedback.selection();
                          context.push('/diagnostics');
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                    Semantics(
                      button: true,
                      label: 'Export Sanitized Diagnostics Bundle',
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 48),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              ZoopFeedback.light();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Sanitized diagnostic bundle saved to logs'),
                                  backgroundColor: ZoopColors.accentGreen,
                                ),
                              );
                            },
                            icon: const Icon(Icons.download, size: 16, color: ZoopColors.primaryCyan),
                            label: const Text('Export Sanitized Diagnostics Bundle', style: TextStyle(fontSize: 12, color: ZoopColors.primaryCyan)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: ZoopColors.surfaceBorder),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: ZoopColors.textMuted,
        ),
      ),
    );
  }

  Widget _buildAboutRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ZoopColors.textPrimary, fontFamily: 'monospace')),
      ],
    );
  }
}
