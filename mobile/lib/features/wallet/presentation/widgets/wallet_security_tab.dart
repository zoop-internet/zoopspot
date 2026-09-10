import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../identity/domain/identity_model.dart';
import '../../../settings/application/settings_notifier.dart';
import '../../../settings/domain/settings_models.dart';
import '../../../settings/presentation/widgets/pin_change_dialog.dart';

/// Security & Cryptography settings and recovery enclave tab.
class WalletSecurityTab extends StatelessWidget {
  final IdentityModel identityState;
  final AppSettings settings;
  final SettingsNotifier settingsNotifier;
  final VoidCallback onViewRecoveryPhrase;
  final VoidCallback onDiagnostics;

  const WalletSecurityTab({
    super.key,
    required this.identityState,
    required this.settings,
    required this.settingsNotifier,
    required this.onViewRecoveryPhrase,
    required this.onDiagnostics,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Identity Summary Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'CRYPTO ENCLAVE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.0,
                        color: ZoopColors.textMuted,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (identityState.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber)
                            .withValues(alpha: 0.15),
                        borderRadius: ZoopSpacing.radiusSm,
                      ),
                      child: Text(
                        identityState.isBackedUp ? 'BACKED UP' : 'BACKUP NEEDED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: identityState.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                        ),
                      ),
                    ),
                  ],
                ),
                ZoopSpacing.gapSm,
                Text(
                  identityState.zoopId ?? 'Generating Identity...',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: ZoopColors.primaryCyan,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Curve25519 root private key sealed on this hardware device',
                  style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                ),
                ZoopSpacing.gapLg,
                Semantics(
                  label: 'View 24-word cryptographic recovery phrase',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: onViewRecoveryPhrase,
                      icon: const Icon(Icons.key_rounded, size: 16),
                      label: const Text('View 24-Word Recovery Phrase'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ZoopColors.primaryCyan,
                        side: const BorderSide(color: ZoopColors.primaryCyan),
                        minimumSize: const Size.fromHeight(48),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          ZoopSpacing.gapXl,

          // Security Policies
          _buildSectionHeader('DEVICE PROTECTION', ZoopColors.textMuted),
          ZoopSpacing.gapSm,
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              children: [
                Semantics(
                  label:
                      'Security PIN, ${settings.hasPinSet ? "PIN protection is active" : "Set a 6-digit PIN"}. Tap to configure PIN.',
                  button: true,
                  child: ListTile(
                    leading: const Icon(Icons.pin, color: ZoopColors.primaryCyan, size: 22),
                    title: const Text('Security PIN', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                    subtitle: Text(
                      settings.hasPinSet ? 'PIN protection is active' : 'Set a 6-digit PIN',
                      style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                    ),
                    trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => PinChangeDialog(
                          onPinChanged: (pin) {
                            settingsNotifier.setPin(pin);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('PIN updated successfully'),
                                backgroundColor: ZoopColors.accentGreen,
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
                const Divider(color: ZoopColors.surfaceBorder, height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.fingerprint, color: ZoopColors.primaryCyan, size: 22),
                  title: const Text('Biometric Authentication', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                  subtitle: const Text('Unlock with Fingerprint or Face ID', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                  value: settings.biometricsEnabled,
                  activeThumbColor: ZoopColors.primaryCyan,
                  onChanged: (_) => settingsNotifier.toggleBiometrics(),
                ),
                const Divider(color: ZoopColors.surfaceBorder, height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.shield_outlined, color: ZoopColors.accentRose, size: 22),
                  title: const Text('Emergency Kill Switch', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                  subtitle: const Text('Block all traffic if VPN disconnects unexpectedly', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                  value: settings.killSwitchEnabled,
                  activeThumbColor: ZoopColors.accentRose,
                  onChanged: (_) => settingsNotifier.toggleKillSwitch(),
                ),
              ],
            ),
          ),
          ZoopSpacing.gapXl,

          // Network & Probe Diagnostics
          _buildSectionHeader('DIAGNOSTIC PROBES', ZoopColors.textMuted),
          ZoopSpacing.gapSm,
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Semantics(
              label: 'Run network diagnostics probe. Double tap to start 9-point audit.',
              button: true,
              child: ListTile(
                onTap: onDiagnostics,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.network_check, color: ZoopColors.primaryCyan, size: 20),
                ),
                title: const Text('Network Diagnostics Probe', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                subtitle: const Text('Run 9-point audit: STUN, NAT, MTU, WireGuard handshake', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: color,
        ),
      ),
    );
  }
}
