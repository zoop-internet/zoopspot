import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../domain/organization_models.dart';

class OrganizationDetailsSheet extends StatelessWidget {
  final OrganizationItem org;
  final VoidCallback onLeave;

  const OrganizationDetailsSheet({
    super.key,
    required this.org,
    required this.onLeave,
  });

  void _confirmLeave(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ZoopColors.surface,
        title: const Text('Leave Organization?', style: TextStyle(color: ZoopColors.accentRose)),
        content: Text(
          'Leaving "${org.name}" will revoke access to its private mesh routes and company devices.',
          style: const TextStyle(color: ZoopColors.textSecondary, fontSize: 13),
        ),
        actions: [
          Semantics(
            button: true,
            label: 'Cancel leaving organization',
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 70),
              child: TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel', style: TextStyle(color: ZoopColors.textSecondary)),
              ),
            ),
          ),
          Semantics(
            button: true,
            label: 'Confirm leaving organization ${org.name}',
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 100),
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop();
                  onLeave();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: ZoopColors.accentRose,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                child: const Text('Leave Organization', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: org.role.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: org.role.color.withValues(alpha: 0.3)),
                    ),
                    child: Icon(Icons.corporate_fare, color: org.role.color, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          org.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '@${org.slug}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: ZoopColors.primaryCyan,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: org.role.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      org.role.label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: org.role.color,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                org.description,
                style: const TextStyle(fontSize: 13, color: ZoopColors.textSecondary),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ZoopColors.background,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    _buildRow('Total Members', '${org.memberCount} users', Icons.people_outline, ZoopColors.textPrimary),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Enrolled Devices', '${org.deviceCount} nodes', Icons.devices, ZoopColors.primaryCyan),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Assigned Mesh Policy', org.policyName, Icons.shield_outlined, ZoopColors.accentGreen),
                    const Divider(color: ZoopColors.surfaceBorder, height: 16),
                    _buildRow('Monthly Bandwidth', org.formattedUsage, Icons.data_usage, ZoopColors.accentAmber),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Semantics(
                button: true,
                label: 'Leave Organization ${org.name}',
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 48),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _confirmLeave(context),
                      icon: const Icon(Icons.exit_to_app, size: 18, color: ZoopColors.accentRose),
                      label: const Text('Leave Organization', style: TextStyle(color: ZoopColors.accentRose, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: ZoopColors.accentRose),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String key, String value, IconData icon, Color valueColor) {
    return Row(
      children: [
        Icon(icon, size: 16, color: ZoopColors.textSecondary),
        const SizedBox(width: 8),
        Text(key, style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
        const Spacer(),
        Text(
          value,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: valueColor),
        ),
      ],
    );
  }
}
