import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';

enum NotificationCategory { all, network, rewards, security }

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String time;
  final NotificationCategory category;
  final IconData icon;
  final Color iconColor;
  bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.category,
    required this.icon,
    required this.iconColor,
    this.isRead = false,
  });
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  NotificationCategory _selectedCategory = NotificationCategory.all;

  final List<NotificationItem> _notifications = [
    NotificationItem(
      id: '1',
      title: 'P2P Link Established',
      message: 'Direct WireGuard mesh tunnel established with MacBook Pro M3.',
      time: '2 min ago',
      category: NotificationCategory.network,
      icon: Icons.hub_rounded,
      iconColor: ZoopColors.primaryCyan,
      isRead: false,
    ),
    NotificationItem(
      id: '2',
      title: '+45 ZP Bandwidth Reward',
      message: 'Earned 45 Zoop Points for relaying 1.2 GB traffic on the autonomous mesh.',
      time: '35 min ago',
      category: NotificationCategory.rewards,
      icon: Icons.auto_awesome_rounded,
      iconColor: ZoopColors.accentGreen,
      isRead: false,
    ),
    NotificationItem(
      id: '3',
      title: 'Daily Participation Bonus',
      message: '+120 ZP credited to your balance for maintaining continuous node availability.',
      time: '3 hours ago',
      category: NotificationCategory.rewards,
      icon: Icons.stars_rounded,
      iconColor: ZoopColors.accentGreen,
      isRead: false,
    ),
    NotificationItem(
      id: '4',
      title: 'Hole Punching Succeeded',
      message: 'NAT traversal resolved without fallback relay. Direct peer latency is 18ms.',
      time: '5 hours ago',
      category: NotificationCategory.security,
      icon: Icons.verified_user_rounded,
      iconColor: ZoopColors.accentPurple,
      isRead: true,
    ),
    NotificationItem(
      id: '5',
      title: 'New Peer Detected',
      message: 'Nearby peer "Linux Gateway 04" is available for trusted peering.',
      time: 'Yesterday',
      category: NotificationCategory.network,
      icon: Icons.devices_rounded,
      iconColor: ZoopColors.primaryCyan,
      isRead: true,
    ),
    NotificationItem(
      id: '6',
      title: 'Identity Key Rotated',
      message: 'Cryptographic session key refreshed according to zero-trust policy.',
      time: '2 days ago',
      category: NotificationCategory.security,
      icon: Icons.shield_rounded,
      iconColor: ZoopColors.accentAmber,
      isRead: true,
    ),
  ];

  void _markAllAsRead() {
    setState(() {
      for (final n in _notifications) {
        n.isRead = true;
      }
    });
  }

  void _clearAll() {
    setState(() {
      _notifications.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedCategory == NotificationCategory.all
        ? _notifications
        : _notifications.where((n) => n.category == _selectedCategory).toList();

    final unreadCount = _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          color: ZoopColors.textPrimary,
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Row(
          children: [
            const Text(
              'Notifications',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: ZoopColors.textPrimary,
              ),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  '$unreadCount NEW',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: ZoopColors.primaryCyan,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (_notifications.isNotEmpty)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded, color: ZoopColors.textSecondary),
              color: ZoopColors.surfaceElevated,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: ZoopColors.surfaceBorder),
              ),
              onSelected: (value) {
                if (value == 'read') _markAllAsRead();
                if (value == 'clear') _clearAll();
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'read',
                  child: Row(
                    children: [
                      Icon(Icons.done_all_rounded, size: 18, color: ZoopColors.primaryCyan),
                      SizedBox(width: 10),
                      Text('Mark all as read', style: TextStyle(color: ZoopColors.textPrimary, fontSize: 13)),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'clear',
                  child: Row(
                    children: [
                      Icon(Icons.clear_all_rounded, size: 18, color: ZoopColors.accentRose),
                      SizedBox(width: 10),
                      Text('Clear all', style: TextStyle(color: ZoopColors.accentRose, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _buildFilterChip('All', NotificationCategory.all),
                  const SizedBox(width: 8),
                  _buildFilterChip('Network', NotificationCategory.network),
                  const SizedBox(width: 8),
                  _buildFilterChip('Rewards', NotificationCategory.rewards),
                  const SizedBox(width: 8),
                  _buildFilterChip('Security', NotificationCategory.security),
                ],
              ),
            ),
          ),

          const Divider(color: ZoopColors.surfaceBorder, height: 1),

          // Notification list
          Expanded(
            child: filtered.isEmpty
                ? _buildEmptyState()
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                    physics: const BouncingScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return _buildNotificationCard(item);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, NotificationCategory category) {
    final isSelected = _selectedCategory == category;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = category),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? ZoopColors.primaryCyan.withValues(alpha: 0.15) : ZoopColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder,
            width: isSelected ? 1.2 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? ZoopColors.primaryCyan : ZoopColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(NotificationItem item) {
    return GestureDetector(
      onTap: () {
        setState(() {
          item.isRead = true;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.isRead ? ZoopColors.surface : ZoopColors.surfaceElevated.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: item.isRead
                ? ZoopColors.surfaceBorder
                : item.iconColor.withValues(alpha: 0.35),
            width: 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon container
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: item.iconColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: item.iconColor.withValues(alpha: 0.3),
                  width: 1.0,
                ),
              ),
              child: Icon(item.icon, color: item.iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            // Message body
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: item.isRead ? FontWeight.w600 : FontWeight.w700,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                      ),
                      Text(
                        item.time,
                        style: const TextStyle(
                          fontSize: 11,
                          color: ZoopColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.message,
                    style: TextStyle(
                      fontSize: 12.5,
                      height: 1.35,
                      color: item.isRead ? ZoopColors.textSecondary : ZoopColors.textPrimary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
            if (!item.isRead) ...[
              const SizedBox(width: 8),
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: item.iconColor,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              shape: BoxShape.circle,
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: const Icon(
              Icons.notifications_off_outlined,
              color: ZoopColors.textMuted,
              size: 28,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No notifications here',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: ZoopColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'You are completely up to date with mesh activity.',
            style: TextStyle(
              fontSize: 12.5,
              color: ZoopColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
