import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/activity_notifier.dart';
import '../../domain/activity_models.dart';
import '../widgets/event_detail_sheet.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  void _showEventDetail(BuildContext context, ActivityEventItem event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EventDetailSheet(event: event),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activityProvider);
    final notifier = ref.read(activityProvider.notifier);

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
            Icon(Icons.timeline, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Activity Timeline',
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
            icon: const Icon(Icons.delete_sweep_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Clear History',
            onPressed: () {
              notifier.clearLogs();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Activity timeline cleared'),
                  backgroundColor: ZoopColors.surfaceElevated,
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Category Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: ActivityCategory.values.map((cat) {
                  final isSelected = state.selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: isSelected,
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            cat.icon,
                            size: 14,
                            color: isSelected ? ZoopColors.background : ZoopColors.textSecondary,
                          ),
                          const SizedBox(width: 6),
                          Text(cat.label),
                        ],
                      ),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? ZoopColors.background : ZoopColors.textSecondary,
                      ),
                      backgroundColor: ZoopColors.surface,
                      selectedColor: ZoopColors.primaryCyan,
                      side: BorderSide(
                        color: isSelected ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                      ),
                      onSelected: (_) => notifier.setCategory(cat),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Event List
            Expanded(
              child: state.filteredEvents.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.history_toggle_off, size: 48, color: ZoopColors.textMuted),
                          SizedBox(height: 12),
                          Text(
                            'No Events Found',
                            style: TextStyle(fontWeight: FontWeight.bold, color: ZoopColors.textSecondary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Mesh, connection, and security logs will appear here.',
                            style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: state.filteredEvents.length,
                      itemBuilder: (context, index) {
                        final event = state.filteredEvents[index];
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
                              onTap: () => _showEventDetail(context, event),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: event.severity.color.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        event.category.icon,
                                        color: event.severity.color,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  event.title,
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.bold,
                                                    color: ZoopColors.textPrimary,
                                                  ),
                                                ),
                                              ),
                                              Text(
                                                event.relativeTime,
                                                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            event.description,
                                            style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary, height: 1.3),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.chevron_right, size: 18, color: ZoopColors.textMuted),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
