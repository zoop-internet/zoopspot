import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/biometric_auth_service.dart';
import '../../../../core/theme/zoop_colors.dart';
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
      if (!mounted) return;
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
        leading: Semantics(
          label: 'Back',
          button: true,
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary),
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            onPressed: () {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                context.go('/dashboard');
              }
            },
          ),
        ),
        title: const Text('Your Identity'),
        actions: [
          if (state.hasIdentity)
            Semantics(
              label: 'Verify cloud trust',
              button: true,
              child: IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Verify Cloud Trust',
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                onPressed: () => ref
                    .read(identityNotifierProvider.notifier)
                    .verifyCloudConnection(),
              ),
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
                'Zero-Knowledge Identity',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Your Zoop identity lives only on this device. No accounts, no servers, and zero telemetry.',
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
                          Expanded(
                            child: Row(
                              children: [
                                const Icon(Icons.verified, color: ZoopColors.accentGreen, size: 22),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Verified Identity',
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          color: ZoopColors.accentGreen,
                                          fontWeight: FontWeight.bold,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
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
                          Semantics(
                            label: 'Zoop ID: ${state.zoopId!}',
                            child: Text(
                              state.zoopId!,
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: ZoopColors.primaryCyan,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 2,
                                  ),
                            ),
                          ),
                          Semantics(
                            label: 'Copy Zoop ID to clipboard',
                            button: true,
                            child: IconButton(
                              icon: const Icon(Icons.copy, size: 20, color: ZoopColors.textMuted),
                              tooltip: 'Copy Zoop ID',
                              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
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

                      Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          childrenPadding: const EdgeInsets.only(bottom: 8),
                          title: const Text(
                            'Advanced Technical Details',
                            style: TextStyle(fontSize: 12, color: ZoopColors.primaryCyan, fontWeight: FontWeight.w600),
                          ),
                          children: [
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('ENDPOINT UUID', style: Theme.of(context).textTheme.labelSmall),
                                  const SizedBox(height: 2),
                                  Text(
                                    state.endpointId ?? 'Deriving...',
                                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                          fontSize: 11,
                                          color: ZoopColors.textMuted,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text('ALGORITHM', style: Theme.of(context).textTheme.labelSmall),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Ed25519 (Curve25519 Enclave)',
                                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                          fontSize: 11,
                                          color: ZoopColors.textMuted,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ],
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
                          Expanded(
                            child: Row(
                              children: [
                                Icon(
                                  state.isBackedUp ? Icons.shield_rounded : Icons.shield_outlined,
                                  color: state.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Security & Recovery',
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.bold,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: (state.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber)
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              state.isBackedUp ? 'BACKED UP' : 'BACKUP PENDING',
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
                      Semantics(
                        label: 'View 24-word cryptographic recovery phrase',
                        button: true,
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _handleViewRecoveryPhrase,
                            icon: const Icon(Icons.key_rounded, size: 18),
                            label: const Text('View 24-Word Recovery Phrase'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: Semantics(
                          label: 'Wipe cryptographic device identity permanently',
                          button: true,
                          child: TextButton.icon(
                            onPressed: _handleResetIdentity,
                            icon: const Icon(Icons.delete_outline, size: 16, color: ZoopColors.accentRose),
                            style: TextButton.styleFrom(
                              minimumSize: const Size(180, 44),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                            label: const Text(
                              'Wipe Device Identity',
                              style: TextStyle(color: ZoopColors.accentRose, fontSize: 13),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Link to Fleet Hub
                Semantics(
                  label: 'Personal Mesh Fleet. Tap to manage paired phones, laptops, and routers in Fleet tab.',
                  button: true,
                  child: Container(
                    decoration: BoxDecoration(
                      color: ZoopColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => context.go('/fleet'),
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.device_hub, color: ZoopColors.primaryCyan, size: 20),
                              ),
                              const SizedBox(width: 14),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Personal Mesh Fleet',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Manage paired phones, laptops & routers in Fleet tab',
                                      style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.arrow_forward_ios, size: 14, color: ZoopColors.textMuted),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                Semantics(
                  label: 'Enter Zoop Mesh Dashboard',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.go('/dashboard'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.primaryCyan,
                        foregroundColor: ZoopColors.background,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Enter Zoop Mesh', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
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
                      Semantics(
                        label: 'Device name input field',
                        child: TextField(
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
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Icon(Icons.cloud_done_outlined, size: 16, color: ZoopColors.primaryCyan),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Cloud Control Plane: zoop-cloud.onrender.com',
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

                Semantics(
                  label: 'Generate zero-knowledge identity and register device',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isLoading ? null : _handleRegister,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.primaryCyan,
                        foregroundColor: ZoopColors.background,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        state.isLoading ? 'Registering Device...' : 'Generate Identity & Register',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
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

                Semantics(
                  label: 'Restore existing identity from 24-word recovery phrase',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: state.isLoading ? null : () => RecoverIdentitySheet.show(context),
                      icon: const Icon(Icons.settings_backup_restore_rounded, size: 18),
                      label: const Text('Restore Existing Identity (24 words)'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

