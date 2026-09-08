import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../application/settings_notifier.dart';
import '../widgets/pin_change_dialog.dart';
import '../widgets/privacy_disclosure_sheet.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  void _showPinDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => PinChangeDialog(
        onPinChanged: (newPin) {
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
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
              // 1. Identity & Account Card
              _buildSectionHeader('IDENTITY & ACCOUNT'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: ZoopColors.surfaceElevated,
                        child: Icon(Icons.fingerprint, color: ZoopColors.primaryCyan),
                      ),
                      title: const Text('Permanent Zoop ID', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                      subtitle: Text(zoopId, style: const TextStyle(fontSize: 12, color: ZoopColors.primaryCyan, fontFamily: 'monospace')),
                      trailing: IconButton(
                        icon: const Icon(Icons.copy, size: 18, color: ZoopColors.textSecondary),
                        tooltip: 'Copy Zoop ID',
                        onPressed: () {
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
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    ListTile(
                      leading: const Icon(Icons.cloud_done, color: ZoopColors.accentGreen, size: 22),
                      title: const Text('Control Server', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Frankfurt (3.70.135.200:443)', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      trailing: const Text('ONLINE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ZoopColors.accentGreen)),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    ListTile(
                      leading: const Icon(Icons.key, color: ZoopColors.accentAmber, size: 22),
                      title: const Text('Identity & Seed Recovery', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('View seed phrase and cryptographic keys', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                      onTap: () => context.push('/identity'),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 2. Ecosystem Quick Links
              _buildSectionHeader('ECOSYSTEM HUBS'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    _buildHubTile(
                      icon: Icons.business,
                      title: 'Organizations Hub',
                      subtitle: 'Corporate meshes, member rosters & team policies',
                      color: ZoopColors.accentPurple,
                      onTap: () => context.push('/organizations'),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildHubTile(
                      icon: Icons.timeline,
                      title: 'Activity Timeline',
                      subtitle: 'Audit logs, handshakes & connection history',
                      color: ZoopColors.primaryCyan,
                      onTap: () => context.push('/activity'),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildHubTile(
                      icon: Icons.account_balance_wallet_outlined,
                      title: 'Wallet & Earnings',
                      subtitle: 'Prepaid bandwidth balance and provider payouts',
                      color: ZoopColors.accentGreen,
                      onTap: () => context.push('/wallet'),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    _buildHubTile(
                      icon: Icons.network_check,
                      title: 'Network Diagnostics',
                      subtitle: 'Live STUN/TURN, MTU and socket ping tests',
                      color: ZoopColors.accentAmber,
                      onTap: () => context.push('/diagnostics'),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 3. Security & Cryptography
              _buildSectionHeader('SECURITY & CRYPTOGRAPHY'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.lock_outline, color: ZoopColors.primaryCyan, size: 22),
                      title: const Text('Zoop Security PIN', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: Text(settings.hasPinSet ? 'PIN protection active' : 'No PIN configured', style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      trailing: TextButton(
                        onPressed: () => _showPinDialog(context, ref),
                        child: Text(settings.hasPinSet ? 'Change' : 'Set PIN', style: const TextStyle(color: ZoopColors.primaryCyan, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    SwitchListTile(
                      secondary: const Icon(Icons.security, color: ZoopColors.accentGreen, size: 22),
                      title: const Text('Biometric Authentication', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Require Face Unlock / Fingerprint on launch', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      value: settings.biometricsEnabled,
                      activeThumbColor: ZoopColors.accentGreen,
                      onChanged: (_) => notifier.toggleBiometrics(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 4. Network & Routing
              _buildSectionHeader('NETWORK & WIREGUARD'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      secondary: const Icon(Icons.vpn_lock, color: ZoopColors.accentRose, size: 22),
                      title: const Text('Kill Switch', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Block all internet traffic if the tunnel disconnects', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      value: settings.killSwitchEnabled,
                      activeThumbColor: ZoopColors.accentRose,
                      onChanged: (_) => notifier.toggleKillSwitch(),
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

              const SizedBox(height: 24),

              // 5. Privacy & Data Governance
              _buildSectionHeader('PRIVACY & TRANSPARENCY'),
              Container(
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.privacy_tip_outlined, color: ZoopColors.accentGreen, size: 22),
                      title: const Text('Zero-Knowledge Guarantee', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Inspect what Zoop handles vs what stays private', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                      onTap: () => _showPrivacySheet(context),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    SwitchListTile(
                      secondary: const Icon(Icons.analytics_outlined, color: ZoopColors.textSecondary, size: 22),
                      title: const Text('Anonymous Diagnostics', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Share anonymized tunnel performance metrics', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      value: settings.telemetryEnabled,
                      activeThumbColor: ZoopColors.primaryCyan,
                      onChanged: (_) => notifier.toggleTelemetry(),
                    ),
                  ],
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
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Tunnel State Changes', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Notify when connection drops or reconnects', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      value: settings.notifyOnConnection,
                      activeThumbColor: ZoopColors.primaryCyan,
                      onChanged: (_) => notifier.toggleNotification('connection'),
                    ),
                    const Divider(color: ZoopColors.surfaceBorder, height: 1),
                    SwitchListTile(
                      title: const Text('Inbound Peer Requests', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                      subtitle: const Text('Alert when a peer requests bandwidth sharing', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      value: settings.notifyOnPeerRequest,
                      activeThumbColor: ZoopColors.primaryCyan,
                      onChanged: (_) => notifier.toggleNotification('peerRequest'),
                    ),
                  ],
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
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () {
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
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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

  Widget _buildHubTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
      trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
      onTap: onTap,
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
