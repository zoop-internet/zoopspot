import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/crypto/mnemonic_service.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/identity_notifier.dart';

class RecoverIdentitySheet extends ConsumerStatefulWidget {
  const RecoverIdentitySheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const RecoverIdentitySheet(),
    );
  }

  @override
  ConsumerState<RecoverIdentitySheet> createState() => _RecoverIdentitySheetState();
}

class _RecoverIdentitySheetState extends ConsumerState<RecoverIdentitySheet> {
  final TextEditingController _phraseController = TextEditingController();
  final TextEditingController _deviceNameController = TextEditingController(text: 'Restored Device');
  String? _validationError;

  @override
  void dispose() {
    _phraseController.dispose();
    _deviceNameController.dispose();
    super.dispose();
  }

  List<String> _extractWords() {
    final text = _phraseController.text.trim();
    if (text.isEmpty) return [];
    return text
        .split(RegExp(r'[\s,]+'))
        .map((w) => w.trim().toLowerCase())
        .where((w) => w.isNotEmpty)
        .toList();
  }

  Future<void> _handleRestore() async {
    final words = _extractWords();

    if (words.length != 24) {
      setState(() {
        _validationError = 'Please enter exactly 24 words. Currently: ${words.length} words.';
      });
      return;
    }

    try {
      MnemonicService.mnemonicToEntropy(words);
    } catch (e) {
      setState(() {
        _validationError = e.toString().replaceFirst('MnemonicException: ', '');
      });
      return;
    }

    setState(() => _validationError = null);

    final deviceName = _deviceNameController.text.trim().isNotEmpty
        ? _deviceNameController.text.trim()
        : 'Restored Device';

    final success = await ref
        .read(identityNotifierProvider.notifier)
        .recoverIdentity(words: words, deviceName: deviceName);

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pop();
      context.go('/dashboard');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Zoop identity successfully restored and verified with Frankfurt cloud!'),
          backgroundColor: ZoopColors.accentGreen,
        ),
      );
    } else {
      final err = ref.read(identityNotifierProvider).errorMessage ?? 'Recovery failed';
      setState(() {
        _validationError = err;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final words = _extractWords();
    final isLoading = ref.watch(identityNotifierProvider).isLoading;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24.0,
            right: 24.0,
            top: 16.0,
            bottom: bottomInset + 16.0,
          ),
          child: ListView(
            controller: scrollController,
            children: [
              // Sheet Handle
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
              const SizedBox(height: 20),

              // Title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.settings_backup_restore_rounded, color: ZoopColors.primaryCyan, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Restore Zoop Identity', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 2),
                        Text(
                          'Enter your 24-word secret phrase to restore your Zoop ID',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Device Name Input
              Text('Device Label', style: Theme.of(context).textTheme.labelSmall),
              const SizedBox(height: 6),
              TextField(
                controller: _deviceNameController,
                enabled: !isLoading,
                decoration: InputDecoration(
                  hintText: 'e.g. Pixel 8, Personal Phone',
                  filled: true,
                  fillColor: ZoopColors.surfaceElevated,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Word Count & Paste Area
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('24 Recovery Words', style: Theme.of(context).textTheme.labelSmall),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: words.length == 24
                          ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                          : ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${words.length} / 24 words',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: words.length == 24 ? ZoopColors.accentGreen : ZoopColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              TextField(
                controller: _phraseController,
                enabled: !isLoading,
                maxLines: 4,
                onChanged: (_) {
                  if (_validationError != null) {
                    setState(() => _validationError = null);
                  } else {
                    setState(() {});
                  }
                },
                decoration: InputDecoration(
                  hintText: 'Paste or type all 24 words separated by spaces...',
                  filled: true,
                  fillColor: ZoopColors.surfaceElevated,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Error banner if invalid
              if (_validationError != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentRose.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: ZoopColors.accentRose.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: ZoopColors.accentRose, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _validationError!,
                          style: const TextStyle(color: ZoopColors.accentRose, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Restore Action Button
              ElevatedButton(
                onPressed: isLoading ? null : _handleRestore,
                child: Text(isLoading ? 'Restoring & Verifying...' : 'Restore & Enter Zoop Mesh'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
