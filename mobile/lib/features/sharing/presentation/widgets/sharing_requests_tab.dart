import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../domain/sharing_models.dart';

/// Inbound peer connection requests list and approval controls.
class SharingRequestsTab extends StatelessWidget {
  final List<InboundSharingRequestItem> requests;
  final ValueChanged<String> onApprove;
  final ValueChanged<String> onReject;

  const SharingRequestsTab({
    super.key,
    required this.requests,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) {
      return const Center(
        child: Padding(
          padding: ZoopSpacing.modalPadding,
          child: ZoopEmptyState(
            icon: Icons.mark_email_read_outlined,
            title: 'No Pending Requests',
            description:
                'When friends scan your QR or enter your PIN, their connection requests will wait here for your approval.',
          ),
        ),
      );
    }

    return ListView.separated(
      padding: ZoopSpacing.screenPadding,
      physics: const BouncingScrollPhysics(),
      itemCount: requests.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final req = requests[index];
        return Semantics(
          container: true,
          label:
              'Connection request from ${req.name}, device ${req.requesterZoopId} on ${req.platform}.',
          child: Container(
            padding: ZoopSpacing.cardPadding,
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: ZoopSpacing.radiusLg,
              border: Border.all(
                color: ZoopColors.primaryCyan.withValues(alpha: 0.35),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: ZoopColors.surfaceElevated,
                        borderRadius: ZoopSpacing.radiusMd,
                      ),
                      child: const Icon(
                        Icons.person_outline_rounded,
                        color: ZoopColors.primaryCyan,
                        size: 20,
                      ),
                    ),
                    ZoopSpacing.gapMd,
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.name,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: ZoopColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${req.requesterZoopId} • ${req.platform}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: ZoopColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                ZoopSpacing.gapLg,
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Semantics(
                      button: true,
                      label: 'Decline request from ${req.name}',
                      child: TextButton(
                        onPressed: () => onReject(req.id),
                        style: TextButton.styleFrom(
                          foregroundColor: ZoopColors.textMuted,
                          minimumSize: const Size(80, 44),
                        ),
                        child: const Text('Decline'),
                      ),
                    ),
                    ZoopSpacing.gapSm,
                    Semantics(
                      button: true,
                      label: 'Grant access to ${req.name}',
                      child: ElevatedButton(
                        onPressed: () => onApprove(req.id),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.primaryCyan,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          minimumSize: const Size(110, 44),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          textStyle: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        child: const Text('Grant Access'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
