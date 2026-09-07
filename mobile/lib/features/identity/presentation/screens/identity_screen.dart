import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/biometric_auth_service.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../pairing/application/pairing_notifier.dart';
import '../../../pairing/presentation/widgets/pairing_sheet.dart';
import '../../application/identity_notifier.dart';
import '../widgets/recover_identity_sheet.dart';
import '../widgets/recovery_phrase_sheet.dart';

class IdentityScreen extends ConsumerStatefulWidget {
  const IdentityScreen({super.key});

  @override
  ConsumerState<IdentityScreen> createState() => _IdentityScreenState();
}

class _IdentityScreenState extends ConsumerState<IdentityScreen> {
  late final TextEditingController _deviceNameController;

  @override
  void initState() {
    super.initState();
    _deviceNameController = TextEditingController(text: 'Android Device');
  }

  @override
  void dispose() {
    _deviceNameController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final name = _deviceNameController.text.trim().isNotEmpty
        ? _deviceNameController.text.trim()
        : 'Android Device';

    final success = await ref
        .read(identityNotifierProvider.notifier)
        .createAndRegister(deviceName: name);

    if (!mounted) return;

    if (!success) {
      final err = ref.read(identityNotifierProvider).errorMessage ?? 'Registration failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: ZoopColors.accentRose,
        ),
      );
    }
  }

  Future<void> _handleViewRecoveryPhrase() async {
    final bioAuth = ref.read(biometricAuthServiceProvider);
    final authenticated = await bioAuth.authenticate(
      title: 'Zoop Recovery Security',
      description: 'Authenticate to access your 24-word cryptographic seed phrase',
    );

    if (!mounted) return;

    if (!authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Authentication required to view secret recovery phrase'),
          backgroundColor: ZoopColors.accentRose,
        ),
      );
      return;
    }

    final words = await ref.read(identityNotifierProvider.notifier).getRecoveryMnemonic();
    if (!mounted) return;

    if (words == null || words.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not derive recovery phrase from local secure storage'),
          backgroundColor: ZoopColors.accentRose,
        ),
      );
      return;
    }

    RecoveryPhraseSheet.show(context, words);
  }

  Future<void> _handleResetIdentity() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ZoopColors.surface,
        title: const Text('Wipe Device Identity?'),
        content: const Text(
          'This will permanently delete your cryptographic keys from this device. If you haven\'t backed up your 24-word recovery phrase, you will permanently lose access to this Zoop ID.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: ZoopColors.accentRose),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Wipe Identity'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(identityNotifierProvider.notifier).resetIdentity();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Device identity successfully reset')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(identityNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cryptographic Identity'),
        actions: [
          if (state.hasIdentity)
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Verify Cloud Trust',
              onPressed: () => ref
                  .read(identityNotifierProvider.notifier)
                  .verifyCloudConnection(),
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Zero-Knowledge Trust',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Zoop uses local Ed25519 public key cryptography. Your identity is generated securely on this device and registered with the Frankfurt Cloud Control Plane without email, passwords, or personal tracking.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 28),

              if (state.isRegistered && state.zoopId != null) ...[
                // Registered Identity Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: ZoopColors.accentGreen.withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.verified, color: ZoopColors.accentGreen, size: 22),
                              const SizedBox(width: 8),
                              Text(
                                'Verified Identity',
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      color: ZoopColors.accentGreen,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              (state.cloudStatus ?? 'trusted').toUpperCase(),
                              style: const TextStyle(
                                color: ZoopColors.accentGreen,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 28, color: ZoopColors.surfaceBorder),

                      // Zoop ID with copy button
                      Text('ZOOP ID', style: Theme.of(context).textTheme.labelSmall),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            state.zoopId!,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: ZoopColors.primaryCyan,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 2,
                                ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 20, color: ZoopColors.textMuted),
                            tooltip: 'Copy Zoop ID',
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: state.zoopId!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Zoop ID copied to clipboard'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Device Name & Endpoint ID
                      Text('DEVICE', style: Theme.of(context).textTheme.labelSmall),
                      const SizedBox(height: 2),
                      Text(
                        state.deviceName ?? 'Android Device',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 12),

                      Text('ENDPOINT UUID', style: Theme.of(context).textTheme.labelSmall),
                      const SizedBox(height: 2),
                      Text(
                        state.endpointId ?? 'Deriving...',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              fontSize: 11,
                              color: ZoopColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Security & Recovery Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: state.isBackedUp
                          ? ZoopColors.surfaceBorder
                          : ZoopColors.accentAmber.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(
                                state.isBackedUp ? Icons.shield_rounded : Icons.shield_outlined,
                                color: state.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                                size: 22,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Security & Recovery',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: (state.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber)
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              state.isBackedUp ? 'BACKED UP' : 'BACKUP RECOMMENDED',
                              style: TextStyle(
                                color: state.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Your Ed25519 root private key is guarded by hardware encryption. Back up your 24-word phrase to protect against device loss.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _handleViewRecoveryPhrase,
                          icon: const Icon(Icons.key_rounded, size: 18),
                          label: const Text('View 24-Word Recovery Phrase'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: TextButton.icon(
                          onPressed: _handleResetIdentity,
                          icon: const Icon(Icons.delete_outline, size: 16, color: ZoopColors.accentRose),
                          label: const Text(
                            'Wipe Device Identity',
                            style: TextStyle(color: ZoopColors.accentRose, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Personal Mesh Fleet & Pairing Section (Phase 8)
                _buildFleetCard(context),

                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.go('/dashboard'),
                    child: const Text('Enter Zoop Mesh'),
                  ),
                ),
              ] else ...[
                // Input form for creating identity
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Device Name', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _deviceNameController,
                        enabled: !state.isLoading,
                        decoration: InputDecoration(
                          hintText: 'e.g. Pixel 8, Galaxy S24, Work Android',
                          filled: true,
                          fillColor: ZoopColors.surfaceElevated,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Icon(Icons.cloud_done_outlined, size: 16, color: ZoopColors.primaryCyan),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Cloud Control Plane: 3.70.135.200 (Frankfurt)',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                Center(
                  child: Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: state.isLoading
                        ? const Center(
                            child: CircularProgressIndicator(color: ZoopColors.primaryCyan),
                          )
                        : const Icon(Icons.fingerprint, size: 48, color: ZoopColors.primaryCyan),
                  ),
                ),
                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: state.isLoading ? null : _handleRegister,
                    child: Text(state.isLoading ? 'Registering Device...' : 'Generate Identity & Register'),
                  ),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    const Expanded(child: Divider(color: ZoopColors.surfaceBorder)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0),
                      child: Text('OR', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted)),
                    ),
                    const Expanded(child: Divider(color: ZoopColors.surfaceBorder)),
                  ],
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: state.isLoading ? null : () => RecoverIdentitySheet.show(context),
                    icon: const Icon(Icons.settings_backup_restore_rounded, size: 18),
                    label: const Text('Restore Existing Identity (24 words)'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
  Widget _buildFleetCard(BuildContext context) {
    final pairingState = ref.watch(pairingNotifierProvider);
    final fleet = pairingState.fleetDevices;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.hub_outlined, size: 20, color: ZoopColors.primaryCyan),
                  const SizedBox(width: 8),
                  Text('Personal Mesh Fleet', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${fleet.isEmpty ? 1 : fleet.length} NODES',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.primaryCyan,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Link secondary phones, laptops, and OpenWrt edge routers to your personal Zoop network.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (fleet.isNotEmpty) ...[
            Container(
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: fleet.length,
                separatorBuilder: (_, __) => const Divider(height: 1, color: ZoopColors.surfaceBorder),
                itemBuilder: (context, index) {
                  final dev = fleet[index];
                  final isSelf = dev['is_self'] as bool? ?? false;
                  final platform = (dev['platform'] as String? ?? 'android').toLowerCase();
                  final name = dev['name'] as String? ?? 'Node';

                  IconData icon = Icons.phone_android;
                  if (platform.contains('linux') || platform.contains('router') || platform.contains('openwrt')) {
                    icon = Icons.router_rounded;
                  } else if (platform.contains('mac') || platform.contains('apple')) {
                    icon = Icons.laptop_mac;
                  } else if (platform.contains('windows')) {
                    icon = Icons.laptop_windows;
                  }

                  return ListTile(
                    dense: true,
                    leading: Icon(icon, color: isSelf ? ZoopColors.accentGreen : ZoopColors.primaryCyan, size: 20),
                    title: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      isSelf ? 'Active Host' : 'Paired via Mesh',
                      style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: (isSelf ? ZoopColors.accentGreen : ZoopColors.primaryCyan).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isSelf ? 'THIS DEVICE' : 'PAIRED',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: isSelf ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => PairingSheet.show(context),
              icon: const Icon(Icons.qr_code_scanner, size: 18),
              label: const Text('Pair New Device (QR / PIN)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: ZoopColors.surfaceElevated,
                foregroundColor: ZoopColors.primaryCyan,
                side: const BorderSide(color: ZoopColors.primaryCyan),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
