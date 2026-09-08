import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/activity_notifier.dart';
import '../../domain/activity_models.dart';
import '../widgets/event_detail_sheet.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  bool _showSearch = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showEventDetail(BuildContext context, ActivityEventItem event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EventDetailSheet(event: event),
    );
  }

  /// Returns a category-specific selected chip color.
  Color _categoryChipColor(ActivityCategory cat) {
    switch (cat) {
      case ActivityCategory.connections:
        return ZoopColors.primaryCyan;
      case ActivityCategory.security:
        return ZoopColors.accentRose;
      case ActivityCategory.sharing:
        return ZoopColors.accentPurple;
      case ActivityCategory.devices:
        return ZoopColors.accentAmber;
      case ActivityCategory.all:
        return ZoopColors.primaryCyan;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(activityProvider);
    final notifier = ref.read(activityProvider.notifier);

    // Apply search filter on top of state's filteredEvents
    final searchQuery = _searchController.text.toLowerCase();
    final displayedEvents = searchQuery.isEmpty
        ? state.filteredEvents
        : state.filteredEvents
            .where((e) =>
                e.title.toLowerCase().contains(searchQuery) ||
                e.description.toLowerCase().contains(searchQuery))
            .toList();

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
            Icon(Icons.timeline, color: ZoopColors.primaryCyan, size: 20),
            SizedBox(width: 8),
            Text(
              'Activity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          // Search toggle
          IconButton(
            icon: Icon(
              _showSearch ? Icons.search_off : Icons.search,
              color: _showSearch ? ZoopColors.primaryCyan : ZoopColors.textSecondary,
            ),
            tooltip: 'Search Events',
            onPressed: () {
              setState(() {
                _showSearch = !_showSearch;
                if (!_showSearch) {
                  _searchController.clear();
                }
              });
            },
          ),
          // Clear history
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
          // Export log
          IconButton(
            icon: const Icon(Icons.download_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Export Log',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Activity log export coming soon'),
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
            // Search bar (conditionally visible)
            if (_showSearch)
              Container(
                color: ZoopColors.surface,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search events...',
                    hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: ZoopColors.textMuted, size: 20),
                    filled: true,
                    fillColor: ZoopColors.surfaceElevated,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: ZoopColors.primaryCyan),
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),

            // Category Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: ActivityCategory.values.map((cat) {
                  final isSelected = state.selectedCategory == cat;
                  final chipColor = _categoryChipColor(cat);
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
                      selectedColor: chipColor,
                      side: BorderSide(
                        color: isSelected ? chipColor : ZoopColors.surfaceBorder,
                      ),
                      onSelected: (_) => notifier.setCategory(cat),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Event List
            Expanded(
              child: displayedEvents.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.checklist,
                            size: 56,
                            color: Color(0x4D6B7280), // textMuted with alpha 0.3
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No Events',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: ZoopColors.textSecondary,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Activity will appear here as you use Zoop.',
                            style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: displayedEvents.length,
                      itemBuilder: (context, index) {
                        final event = displayedEvents[index];
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
