import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../activity/application/activity_notifier.dart';
import '../../../activity/domain/activity_models.dart';

/// Activity timeline tab with category filtering and real-time search.
class WalletActivityTab extends StatelessWidget {
  final ActivityState state;
  final ActivityNotifier notifier;
  final TextEditingController searchController;
  final bool showSearch;
  final VoidCallback onToggleSearch;
  final VoidCallback onClearSearch;
  final ValueChanged<ActivityEventItem> onSelectEvent;

  const WalletActivityTab({
    super.key,
    required this.state,
    required this.notifier,
    required this.searchController,
    required this.showSearch,
    required this.onToggleSearch,
    required this.onClearSearch,
    required this.onSelectEvent,
  });

  Color _categoryColor(ActivityCategory cat) {
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
    final searchQuery = searchController.text.toLowerCase();
    final displayedEvents = searchQuery.isEmpty
        ? state.filteredEvents
        : state.filteredEvents.where((e) {
            return e.title.toLowerCase().contains(searchQuery) ||
                e.description.toLowerCase().contains(searchQuery);
          }).toList();

    return Column(
      children: [
        // Filter Chips Row + Search Toggle
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: ZoopColors.background,
          child: Column(
            children: [
              if (showSearch) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: TextField(
                    controller: searchController,
                    autofocus: true,
                    style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search activity events...',
                      hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                      prefixIcon: const Icon(Icons.search, size: 18, color: ZoopColors.primaryCyan),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close, size: 16, color: ZoopColors.textMuted),
                        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                        onPressed: onClearSearch,
                      ),
                      filled: true,
                      fillColor: ZoopColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: ZoopSpacing.radiusMd,
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: ZoopSpacing.radiusMd,
                        borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                      ),
                    ),
                  ),
                ),
              ],
              Row(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ActivityCategory.values.map((cat) {
                          final isSelected = state.selectedCategory == cat;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: FilterChip(
                              label: Text(
                                cat.label,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isSelected ? Colors.black : ZoopColors.textSecondary,
                                ),
                              ),
                              selected: isSelected,
                              onSelected: (_) => notifier.setCategory(cat),
                              backgroundColor: ZoopColors.surface,
                              selectedColor: ZoopColors.primaryCyan,
                              showCheckmark: false,
                              side: BorderSide(
                                color: isSelected ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  Semantics(
                    label: showSearch ? 'Close activity search' : 'Open activity search',
                    button: true,
                    child: IconButton(
                      icon: Icon(
                        showSearch ? Icons.search_off : Icons.search,
                        size: 20,
                        color: ZoopColors.primaryCyan,
                      ),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      onPressed: onToggleSearch,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Events List
        Expanded(
          child: displayedEvents.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Center(
                    child: ZoopEmptyState(
                      icon: searchQuery.isNotEmpty ? Icons.search_off : Icons.checklist_rounded,
                      title: searchQuery.isNotEmpty ? 'No Matching Events' : 'No Activity Events Yet',
                      description: searchQuery.isNotEmpty
                          ? 'No events match "${searchController.text}". Try clearing your search query or switching categories.'
                          : 'Security, tunnel, and sharing events will record automatically as you participate in the mesh.',
                      secondaryActionLabel: searchQuery.isNotEmpty ? 'Clear Search' : null,
                      onSecondaryAction: searchQuery.isNotEmpty ? onClearSearch : null,
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: displayedEvents.length,
                  itemBuilder: (context, index) {
                    final event = displayedEvents[index];
                    final chipColor = _categoryColor(event.category);
                    return Semantics(
                      label: '${event.title}, ${event.relativeTime}, ${event.description}. Tap to view event details.',
                      button: true,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: ZoopColors.surface,
                          borderRadius: ZoopSpacing.radiusMd,
                          border: Border.all(color: ZoopColors.surfaceBorder),
                        ),
                        child: ListTile(
                          onTap: () => onSelectEvent(event),
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: chipColor.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(event.category.icon, color: chipColor, size: 18),
                          ),
                          title: Text(
                            event.title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          subtitle: Text(
                            '${event.relativeTime} • ${event.description}',
                            style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: const Icon(Icons.chevron_right, size: 16, color: ZoopColors.textMuted),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
