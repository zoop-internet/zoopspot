import 'package:crypto/crypto.dart' as crypto;
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../../core/theme/zoop_colors.dart';

class IdentityScreen extends StatefulWidget {
  const IdentityScreen({super.key});

  @override
  State<IdentityScreen> createState() => _IdentityScreenState();
}

class _IdentityScreenState extends State<IdentityScreen> {
  final SecureStorageService _storage = SecureStorageService();
  bool _isGenerating = false;
  String? _generatedPubKey;
  String? _zoopId;

  Future<void> _generateIdentity() async {
    setState(() => _isGenerating = true);

    try {
      final algorithm = Ed25519();
      final keyPair = await algorithm.newKeyPair();
      final publicKey = await keyPair.extractPublicKey();
      final privateKeyBytes = await keyPair.extractPrivateKeyBytes();

      final pubHex = publicKey.bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      final privHex = privateKeyBytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

      // Compute ZoopID fingerprint (SHA-256 truncated)
      final hash = crypto.sha256.convert(publicKey.bytes);
      final id = 'zoop_${hash.toString().substring(0, 12)}';

      await _storage.saveIdentity(
        zoopId: id,
        publicKeyHex: pubHex,
        privateKeyHex: privHex,
        deviceName: 'Android Phone',
      );

      if (!mounted) return;
      setState(() {
        _isGenerating = false;
        _generatedPubKey = pubHex;
        _zoopId = id;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isGenerating = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating identity: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cryptographic Identity'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your Zoop ID',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Zoop uses decentralized Ed25519 public key cryptography. Your identity is generated securely on this device and never stored on any centralized server.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),

              if (_zoopId != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ZoopColors.accentGreen.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.verified, color: ZoopColors.accentGreen, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Active Identity',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  color: ZoopColors.accentGreen,
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text('Zoop ID', style: Theme.of(context).textTheme.bodyMedium),
                      Text(
                        _zoopId!,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              fontSize: 14,
                              color: ZoopColors.primaryCyan,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Text('Ed25519 Public Key', style: Theme.of(context).textTheme.bodyMedium),
                      Text(
                        _generatedPubKey!,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              fontSize: 10,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.go('/dashboard'),
                    child: const Text('Enter Zoop Mesh'),
                  ),
                ),
              ] else ...[
                const Spacer(),
                Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: _isGenerating
                        ? const Center(
                            child: CircularProgressIndicator(color: ZoopColors.primaryCyan),
                          )
                        : const Icon(Icons.fingerprint, size: 50, color: ZoopColors.primaryCyan),
                  ),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isGenerating ? null : _generateIdentity,
                    child: Text(_isGenerating ? 'Generating Keys...' : 'Generate My Identity'),
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
