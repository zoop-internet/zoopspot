import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/identity_notifier.dart';

class RecoveryPhraseSheet extends ConsumerStatefulWidget {
  final List<String> words;

  const RecoveryPhraseSheet({super.key, required this.words});

  static Future<void> show(BuildContext context, List<String> words) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => RecoveryPhraseSheet(words: words),
    );
  }

  @override
  ConsumerState<RecoveryPhraseSheet> createState() => _RecoveryPhraseSheetState();
}

class _RecoveryPhraseSheetState extends ConsumerState<RecoveryPhraseSheet> {
  bool _copied = false;
  bool _isRevealed = false;

  void _copyAll() {
    Clipboard.setData(ClipboardData(text: widget.words.join(' ')));
    setState(() => _copied = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('24-word recovery phrase copied. Clear your clipboard history after storing securely!'),
        backgroundColor: ZoopColors.accentAmber,
        duration: Duration(seconds: 4),
      ),
    );
  }

  void _confirmBackedUp() {
    ref.read(identityNotifierProvider.notifier).markAsBackedUp();
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Identity marked as securely backed up'),
        backgroundColor: ZoopColors.accentGreen,
      ),
    );
  }

  Widget _buildWordGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 2.8,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: widget.words.length,
      itemBuilder: (context, idx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: ZoopColors.surfaceElevated,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: ZoopColors.surfaceBorder),
          ),
          child: Row(
            children: [
              Text(
                '${idx + 1}.',
                style: const TextStyle(
                  color: ZoopColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  widget.words[idx],
                  style: const TextStyle(
                    color: ZoopColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.3,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
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
                      color: ZoopColors.accentAmber.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.vpn_key_rounded, color: ZoopColors.accentAmber, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Secret Recovery Phrase', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 2),
                        Text(
                          '24 words representing your decentralized cryptographic seed',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Warning Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ZoopColors.accentAmber.withValues(alpha: 0.4)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: ZoopColors.accentAmber, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Do not share these words with anyone. Anyone with this phrase can restore and control your Zoop ID and mesh connections.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: ZoopColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Word Grid with blur shield overlay when not revealed
              Stack(
                children: [
                  // Always render the grid underneath
                  _buildWordGrid(),

                  // Blur overlay when not revealed
                  if (!_isRevealed)
                    Positioned.fill(
                      child: GestureDetector(
                        onTap: () => setState(() => _isRevealed = true),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                            child: Container(
                              color: ZoopColors.background.withValues(alpha: 0.7),
                              child: const Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.visibility_off,
                                      size: 40,
                                      color: ZoopColors.textMuted,
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      'Tap to reveal recovery phrase',
                                      style: TextStyle(
                                        color: ZoopColors.textMuted,
                                        fontSize: 13,
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Make sure no one can see your screen',
                                      style: TextStyle(
                                        color: ZoopColors.textMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),

              // Copy All Button — only shown when revealed
              if (_isRevealed) ...[
                Semantics(
                  label: _copied ? 'Copied to clipboard' : 'Copy all 24 words to clipboard',
                  button: true,
                  child: OutlinedButton.icon(
                    onPressed: _copyAll,
                    icon: Icon(_copied ? Icons.check : Icons.copy, size: 18),
                    label: Text(_copied ? 'Copied to Clipboard' : 'Copy All 24 Words'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Confirm Button — always shown
              Semantics(
                label: 'Confirm you have safely saved the recovery phrase',
                button: true,
                child: ElevatedButton(
                  onPressed: _confirmBackedUp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ZoopColors.primaryCyan,
                    foregroundColor: ZoopColors.background,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('I Have Safely Saved These Words', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
