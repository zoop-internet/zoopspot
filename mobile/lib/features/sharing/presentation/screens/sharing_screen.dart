import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/sharing_notifier.dart';
import '../../domain/sharing_models.dart';
import '../widgets/recipient_details_sheet.dart';
import '../widgets/sharing_policy_sheet.dart';

class SharingScreen extends ConsumerWidget {
  const SharingScreen({super.key});

  void _showPolicySheet(BuildContext context, WidgetRef ref, SharingPolicy currentPolicy) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SharingPolicySheet(
        initialPolicy: currentPolicy,
        onSave: (policy) {
          ref.read(sharingProvider.notifier).updatePolicy(policy);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Sharing policies successfully updated'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
        },
      ),
    );
  }

  void _showRecipientSheet(BuildContext context, WidgetRef ref, ConnectedRecipientItem recipient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RecipientDetailsSheet(
        recipient: recipient,
        onRevoke: () {
          ref.read(sharingProvider.notifier).revokeRecipient(recipient.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Session revoked for ${recipient.name}'),
              backgroundColor: ZoopColors.surfaceElevated,
            ),
          );
        },
        onBlock: () {
          ref.read(sharingProvider.notifier).revokeRecipient(recipient.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${recipient.name} blocked from connecting'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sharingProvider);
    final notifier = ref.read(sharingProvider.notifier);

    // Safe quota progress clamped to [0.0, 1.0]
    final quotaProgress = state.policy.dailyDataCapGb > 0
        ? (state.usedTodayGb / state.policy.dailyDataCapGb).clamp(0.0, 1.0)
        : 0.0;

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.wifi_tethering, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Sharing',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune, color: ZoopColors.textSecondary),
            tooltip: 'Sharing Policies',
            onPressed: () => _showPolicySheet(context, ref, state.policy),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Master Sharing Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: state.isSharingActive
                        ? [
                            const Color(0xFF0F2B38),
                            ZoopColors.surface,
                          ]
                        : [
                            ZoopColors.surface,
                            ZoopColors.surfaceElevated,
                          ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: state.isSharingActive
                        ? ZoopColors.primaryCyan.withValues(alpha: 0.4)
                        : ZoopColors.surfaceBorder,
                  ),
                ),
                child: Column(
                  children: [
                    // Toggle row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: state.status.color.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                state.isSharingActive ? Icons.wifi_tethering : Icons.wifi_tethering_off,
                                color: state.status.color,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Bandwidth Sharing',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: ZoopColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  state.status.label,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: state.status.color,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Switch(
                          value: state.isSharingActive,
                          activeThumbColor: ZoopColors.primaryCyan,
                          onChanged: (_) => notifier.toggleSharing(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Live Egress & Quota Counters
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: ZoopColors.background.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: ZoopColors.surfaceBorder),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              // Live Egress
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Live Outbound Egress',
                                      style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.arrow_upward, size: 14, color: ZoopColors.accentGreen),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${state.currentEgressMbps.toStringAsFixed(1)} Mbps',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: ZoopColors.accentGreen,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Container(width: 1, height: 36, color: ZoopColors.surfaceBorder),
                              const SizedBox(width: 14),
                              // Daily Quota with progress bar
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Daily Quota Used',
                                      style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                                    ),
                                    const SizedBox(height: 6),
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: quotaProgress,
                                        color: ZoopColors.accentGreen,
                                        backgroundColor: ZoopColors.surfaceBorder,
                                        minHeight: 5,
                                      ),
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      '${state.usedTodayGb.toStringAsFixed(1)} / ${state.policy.dailyDataCapGb.round()} GB',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: ZoopColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Divider(color: ZoopColors.surfaceBorder, height: 1),
                          const SizedBox(height: 12),
                          // Earnings + Withdraw row
                          Row(
                            children: [
                              // Today's earnings pill
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: ZoopColors.accentGreen.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.trending_up, size: 14, color: ZoopColors.accentGreen),
                                    SizedBox(width: 5),
                                    Text(
                                      'Today +\$0.32',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: ZoopColors.accentGreen,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Spacer(),
                              // Withdraw stub
                              TextButton(
                                onPressed: () => context.go('/vault'),
                                style: TextButton.styleFrom(
                                  foregroundColor: ZoopColors.primaryCyan,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text(
                                  'Withdraw',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: ZoopColors.primaryCyan,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Inbound Sharing Requests Queue
              if (state.pendingRequests.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'INBOUND REQUESTS',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: ZoopColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: ZoopColors.primaryCyan,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${state.pendingRequests.length}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: ZoopColors.background,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...state.pendingRequests.map((req) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: ZoopColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: ZoopColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.person_add_outlined, size: 20, color: ZoopColors.primaryCyan),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    req.name,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: ZoopColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${req.requesterZoopId} • ${req.platform}',
                                    style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${req.trustScore}% Trust',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: ZoopColors.accentGreen,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (req.note.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(
                            req.note,
                            style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary, fontStyle: FontStyle.italic),
                          ),
                        ],
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: () => notifier.rejectRequest(req.id),
                              child: const Text('Decline', style: TextStyle(color: ZoopColors.textMuted, fontSize: 12)),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () => notifier.approveRequest(req.id),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: ZoopColors.primaryCyan,
                                foregroundColor: ZoopColors.background,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text('Grant Access', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 16),
              ],

              // Connected Clients List
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'CONNECTED RECIPIENTS (${state.recipients.length})',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: ZoopColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (state.recipients.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.wifi_protected_setup, size: 40, color: ZoopColors.textMuted),
                      SizedBox(height: 10),
                      Text(
                        'No Connected Peers',
                        style: TextStyle(fontWeight: FontWeight.bold, color: ZoopColors.textSecondary),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Authorized peers will appear here when connected to your sharing node.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                      ),
                    ],
                  ),
                )
              else
                ...state.recipients.map((recipient) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: ZoopColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ZoopColors.surfaceBorder),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _showRecipientSheet(context, ref, recipient),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.laptop, color: ZoopColors.accentGreen, size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          recipient.name,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: ZoopColors.textPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${recipient.peerZoopId} • ${recipient.platform}',
                                          style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, size: 18, color: ZoopColors.textMuted),
                                    onPressed: () => notifier.revokeRecipient(recipient.id),
                                    tooltip: 'Revoke Session',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Divider(color: ZoopColors.surfaceBorder, height: 1),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.speed, size: 14, color: ZoopColors.accentGreen),
                                      const SizedBox(width: 4),
                                      Text(
                                        recipient.formattedRate,
                                        style: const TextStyle(fontSize: 11, color: ZoopColors.accentGreen, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(width: 12),
                                      const Icon(Icons.data_usage, size: 14, color: ZoopColors.textSecondary),
                                      const SizedBox(width: 4),
                                      Text(
                                        recipient.formattedTransferred,
                                        style: const TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                  // Virtual IP hidden behind long-press; icon shown by default
                                  GestureDetector(
                                    onLongPress: () {
                                      Clipboard.setData(
                                        ClipboardData(text: recipient.assignedVirtualIp),
                                      );
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Virtual IP copied'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    child: const Icon(
                                      Icons.vpn_lock,
                                      size: 18,
                                      color: ZoopColors.primaryCyan,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}
