import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/identity_notifier.dart';

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
                const SizedBox(height: 40),

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
              ],
            ],
          ),
        ),
      ),
    );
  }
}
