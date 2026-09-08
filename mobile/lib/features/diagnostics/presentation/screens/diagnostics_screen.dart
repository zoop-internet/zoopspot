import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/diagnostics_notifier.dart';
import '../../domain/diagnostic_models.dart';

class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(diagnosticsProvider);
    final notifier = ref.read(diagnosticsProvider.notifier);

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
            Icon(Icons.network_check, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Diagnostics',
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
            icon: const Icon(Icons.share, color: ZoopColors.textSecondary),
            tooltip: 'Share Report',
            onPressed: () {
              if (state.report != null) {
                final bundle = notifier.generateShareableBundle();
                Clipboard.setData(ClipboardData(text: bundle));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Diagnostic bundle copied to clipboard'),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Run diagnostics first'),
                  ),
                );
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'diagnosticsFab',
        onPressed: state.isRunning ? null : () => notifier.runDiagnostics(),
        icon: state.isRunning
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: ZoopColors.textPrimary,
                ),
              )
            : const Icon(Icons.play_arrow),
        label: Text(state.isRunning ? 'Running...' : 'Run Diagnostics'),
        backgroundColor: state.isRunning ? ZoopColors.surfaceElevated : ZoopColors.primaryCyan,
        foregroundColor: ZoopColors.textPrimary,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (state.error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentRose.withValues(alpha: 0.1),
                    border: Border.all(color: ZoopColors.accentRose),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    state.error!,
                    style: const TextStyle(color: ZoopColors.accentRose),
                  ),
                ),
              if (state.report != null) ...[
                _buildSummarySection(context, state.report!),
                const SizedBox(height: 16),
                _buildChecksList(context, state.report!.checks, notifier),
                const SizedBox(height: 16),
                _buildActionButtons(context, notifier),
                const SizedBox(height: 80), // spacing for fab
              ] else if (!state.isRunning)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.only(top: 100),
                    child: Column(
                      children: [
                        Icon(
                          Icons.network_check,
                          size: 56,
                          color: ZoopColors.textMuted,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No Report Yet',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.textSecondary,
                          ),
                        ),
                        SizedBox(height: 6),
                        Text(
                          'Tap "Run Diagnostics" to check network health',
                          style: TextStyle(color: ZoopColors.textSecondary, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummarySection(BuildContext context, DiagnosticsReport report) {
    return Container(
      decoration: BoxDecoration(
        color: ZoopColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  report.healthy ? Icons.check_circle : Icons.warning,
                  color: report.healthy ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    report.healthy ? 'Network Healthy' : 'Issues Detected',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ],
            ),
            const Divider(height: 32, color: ZoopColors.surfaceBorder),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildStatColumn('NAT Type', _getNatTypeName(report.natType), _getNatTypeColor(report.natType)),
                _buildStatColumn('MTU', '${report.pathMTU ?? '--'} B', ZoopColors.textPrimary),
                _buildStatColumn(
                  'DNS Leak',
                  report.dnsLeakDetected == true ? 'Leaking' : 'Safe',
                  report.dnsLeakDetected == true ? ZoopColors.accentRose : ZoopColors.accentGreen,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getNatTypeName(NATType? type) {
    switch (type) {
      case NATType.fullCone: return 'Full Cone';
      case NATType.restrictedCone: return 'Restricted';
      case NATType.portRestrictedCone: return 'Port Restr.';
      case NATType.symmetric: return 'Symmetric';
      default: return 'Unknown';
    }
  }

  Color _getNatTypeColor(NATType? type) {
    switch (type) {
      case NATType.fullCone: return ZoopColors.accentGreen;
      case NATType.symmetric: return ZoopColors.accentRose;
      default: return ZoopColors.accentAmber;
    }
  }

  Widget _buildStatColumn(String label, String value, Color valueColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: ZoopColors.textSecondary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildChecksList(
    BuildContext context,
    List<DiagnosticCheck> checks,
    DiagnosticsNotifier notifier,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: ZoopColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: checks.length,
        separatorBuilder: (context, index) => const Divider(height: 1, color: ZoopColors.surfaceBorder),
        itemBuilder: (context, index) {
          final check = checks[index];
          IconData icon;
          Color color;

          switch (check.status) {
            case CheckStatus.passed:
              icon = Icons.check_circle;
              color = ZoopColors.accentGreen;
              break;
            case CheckStatus.failed:
              icon = Icons.error;
              color = ZoopColors.accentRose;
              break;
            case CheckStatus.skipped:
              icon = Icons.skip_next;
              color = ZoopColors.textSecondary;
              break;
            case CheckStatus.running:
              icon = Icons.pending;
              color = ZoopColors.primaryCyan;
              break;
          }

          Widget leadingWidget = check.status == CheckStatus.running
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2, color: ZoopColors.primaryCyan),
                )
              : Icon(icon, color: color);

          // Build trailing: latency chip + retry button for failed checks
          Widget? trailingWidget;
          if (check.status == CheckStatus.failed) {
            trailingWidget = Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (check.latency != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: ZoopColors.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${check.latency!.inMilliseconds} ms',
                      style: const TextStyle(fontSize: 10, color: ZoopColors.textSecondary),
                    ),
                  ),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 16, color: ZoopColors.accentAmber),
                  tooltip: 'Retry',
                  onPressed: () => notifier.runDiagnostics(),
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                  padding: const EdgeInsets.all(4),
                ),
              ],
            );
          } else if (check.latency != null) {
            trailingWidget = Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${check.latency!.inMilliseconds} ms',
                style: const TextStyle(fontSize: 10, color: ZoopColors.textSecondary),
              ),
            );
          }

          return ListTile(
            leading: leadingWidget,
            title: Text(check.name),
            subtitle: Text(
              check.message,
              style: const TextStyle(color: ZoopColors.textSecondary, fontSize: 12),
            ),
            trailing: trailingWidget,
          );
        },
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, DiagnosticsNotifier notifier) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () {
              final bundle = notifier.generateShareableBundle();
              Clipboard.setData(ClipboardData(text: bundle));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Diagnostic bundle copied to clipboard')),
              );
            },
            icon: const Icon(Icons.share, size: 18),
            label: const Text('Share Bundle'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              final success = await notifier.submitToCloud();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Report submitted successfully' : 'Failed to submit report'),
                    backgroundColor: success ? ZoopColors.accentGreen : ZoopColors.accentRose,
                  ),
                );
              }
            },
            icon: const Icon(Icons.cloud_upload, size: 18),
            label: const Text('Submit'),
          ),
        ),
      ],
    );
  }
}
