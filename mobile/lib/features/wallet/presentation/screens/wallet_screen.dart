import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/biometric_auth_service.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../activity/application/activity_notifier.dart';
import '../../../activity/domain/activity_models.dart';
import '../../../activity/presentation/widgets/event_detail_sheet.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../../identity/presentation/widgets/recovery_phrase_sheet.dart';
import '../../../settings/application/settings_notifier.dart';
import '../../../settings/presentation/widgets/pin_change_dialog.dart';
import '../../application/wallet_notifier.dart';
import '../widgets/add_funds_sheet.dart';
import '../widgets/withdraw_sheet.dart';
import '../widgets/transaction_detail_sheet.dart';
import '../widgets/payment_brand_icon.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _activitySearchController = TextEditingController();
  bool _showActivitySearch = false;

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
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _activitySearchController.dispose();
    super.dispose();
  }

  void _showAddFunds(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddFundsSheet(
        onConfirm: ({
          required double amount,
          required String method,
          String? phoneNumber,
        }) async {
          final notifier = ref.read(walletProvider.notifier);
          final formattedAmount = 'UGX ${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
          try {
            if (method.toLowerCase().contains('card')) {
              final res = await notifier.addFundsViaCard(amount: amount);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Card checkout initiated for $formattedAmount. Reference: ${res.reference}'),
                    backgroundColor: ZoopColors.primaryCyan,
                  ),
                );
              }
            } else {
              final phone = phoneNumber ?? '';
              final res = await notifier.addFundsViaMobileMoney(
                amount: amount,
                phoneNumber: phone,
                provider: method.toLowerCase().contains('mtn') ? 'mtn' : 'airtel',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Prompt sent to $phone for $formattedAmount. Approve on your phone.'),
                    backgroundColor: ZoopColors.accentGreen,
                  ),
                );
              }
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Payment initiation failed: $e'),
                  backgroundColor: ZoopColors.accentRose,
                ),
              );
            }
          }
        },
      ),
    );
  }

  void _showWithdraw(BuildContext context, double available) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WithdrawSheet(
        availableAmount: available,
        onConfirm: ({
          required double amount,
          required String phoneNumber,
          required String provider,
        }) async {
          final notifier = ref.read(walletProvider.notifier);
          final formattedAmount = 'UGX ${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
          try {
            final res = await notifier.withdrawToMobileMoney(
              amount: amount,
              phoneNumber: phoneNumber,
              provider: provider.toLowerCase().contains('mtn') ? 'mtn' : 'airtel',
            );
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Withdrawal of $formattedAmount to $phoneNumber initiated (${res.reference})'),
                  backgroundColor: ZoopColors.accentGreen,
                ),
              );
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Withdrawal failed: $e'),
                  backgroundColor: ZoopColors.accentRose,
                ),
              );
            }
          }
        },
      ),
    );
  }

  Future<void> _handleViewRecoveryPhrase() async {
    final bioAuth = ref.read(biometricAuthServiceProvider);
    final authenticated = await bioAuth.authenticate(
      title: 'Zoop Recovery Security',
      description: 'Authenticate to access your 24-word cryptographic seed phrase',
    );

    if (!mounted) return;

    if (!authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Authentication required to view recovery phrase'),
          backgroundColor: ZoopColors.accentRose,
        ),
      );
      return;
    }

    final words = await ref.read(identityNotifierProvider.notifier).getRecoveryMnemonic();
    if (!mounted) return;

    if (words == null || words.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not derive recovery phrase from local secure storage'),
          backgroundColor: ZoopColors.accentRose,
        ),
      );
      return;
    }

    RecoveryPhraseSheet.show(context, words);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        leading: context.canPop()
            ? Semantics(
                label: 'Back',
                button: true,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: ZoopColors.textPrimary),
                  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                  onPressed: () => context.pop(),
                ),
              )
            : null,
        title: const Row(
          children: [
            Icon(Icons.account_balance_wallet_rounded, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Wallet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
          ],
        ),
        actions: [
          Semantics(
            label: 'Add funds to mesh wallet',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.add_card_rounded, color: ZoopColors.primaryCyan),
              tooltip: 'Add Funds',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () => _showAddFunds(context),
            ),
          ),
          Semantics(
            label: 'Open application settings',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
              tooltip: 'App Settings',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () => context.push('/settings'),
            ),
          ),
          const SizedBox(width: 4),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: ZoopColors.surfaceBorder,
                  width: 1,
                ),
              ),
            ),
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              indicatorColor: ZoopColors.primaryCyan,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(
                  child: Semantics(
                    label: 'Balance and earnings tab',
                    child: Row(
                      children: [
                        Icon(Icons.account_balance_wallet_outlined, size: 16),
                        SizedBox(width: 6),
                        Text('Balance & Earnings'),
                      ],
                    ),
                  ),
                ),
                Tab(
                  child: Semantics(
                    label: 'Activity audit tab',
                    child: Row(
                      children: [
                        Icon(Icons.timeline_rounded, size: 16),
                        SizedBox(width: 6),
                        Text('Activity Audit'),
                      ],
                    ),
                  ),
                ),
                Tab(
                  child: Semantics(
                    label: 'Security and keys tab',
                    child: Row(
                      children: [
                        Icon(Icons.shield_outlined, size: 16),
                        SizedBox(width: 6),
                        Text('Security & Keys'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 0: Wallet & Earnings
          _buildWalletTab(context),
          // Tab 1: Activity
          _buildActivityTab(context),
          // Tab 2: Security & Keys
          _buildSecurityTab(context),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 0: WALLET & EARNINGS
  // ==========================================
  Widget _buildWalletTab(BuildContext context) {
    final state = ref.watch(walletProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Available Mesh Balance Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0D2538), ZoopColors.surface],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Available Mesh Balance', style: TextStyle(fontSize: 13, color: ZoopColors.textSecondary)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Prepaid', style: TextStyle(fontSize: 10, color: ZoopColors.primaryCyan, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  state.formatAmount(state.availableBalance),
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: ZoopColors.textPrimary, letterSpacing: -0.5),
                ),
                const SizedBox(height: 16),
                Semantics(
                  label: 'Add funds to prepaid mesh balance',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _showAddFunds(context),
                      icon: const Icon(Icons.add_circle_outline, size: 18),
                      label: const Text('Add Funds', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.primaryCyan,
                        foregroundColor: ZoopColors.background,
                        minimumSize: const Size.fromHeight(48),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Provider Earnings Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Provider Sharing Earnings', style: TextStyle(fontSize: 13, color: ZoopColors.textSecondary)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Active Node', style: TextStyle(fontSize: 10, color: ZoopColors.accentGreen, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          state.formatAmount(state.totalEarnedSharing),
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ZoopColors.accentGreen),
                        ),
                        const SizedBox(height: 2),
                        const Text('Lifetime earned', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${state.totalDataServedGb} GB',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        const Text('Total data relayed', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: ZoopColors.surfaceBorder),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Available to Withdraw', style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary)),
                        const SizedBox(height: 2),
                        Text(
                          state.formatAmount(state.unwithdrawnEarnings),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                      ],
                    ),
                    Semantics(
                      label: 'Withdraw available provider earnings: ${state.formatAmount(state.unwithdrawnEarnings)}',
                      button: true,
                      child: ElevatedButton.icon(
                        onPressed: () => _showWithdraw(context, state.unwithdrawnEarnings),
                        icon: const Icon(Icons.arrow_outward, size: 16),
                        label: const Text('Withdraw', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.surfaceElevated,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(110, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Settlement Rails Info
          Container(
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.payments_outlined, color: ZoopColors.primaryCyan, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Supported Payment Rails',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Instant Settlement',
                        style: TextStyle(fontSize: 10, color: ZoopColors.accentGreen, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    PaymentBrandBadge.mtn(),
                    PaymentBrandBadge.airtel(),
                    PaymentBrandBadge.card(),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Transaction History Header
          _buildSectionHeader('TRANSACTION HISTORY', ZoopColors.textMuted),
          const SizedBox(height: 10),
          if (state.transactions.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: const Center(
                child: Text('No transactions recorded yet', style: TextStyle(fontSize: 12, color: ZoopColors.textMuted)),
              ),
            )
          else
            ...state.transactions.map((tx) {
              return Semantics(
                label: '${tx.type.label}, ${tx.description}, ${tx.formattedAmount}, status ${tx.status.name}. Tap to view transaction receipt.',
                button: true,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => TransactionDetailSheet.show(context, tx),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            PaymentBrandIcon.forMethod(
                              tx.paymentMethod,
                              size: 38,
                              borderRadius: 10,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(tx.type.label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                                  const SizedBox(height: 2),
                                  Text(tx.description, style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(tx.formattedAmount, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: tx.type.color)),
                                const SizedBox(height: 2),
                                Text(tx.status.name.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: tx.status.color)),
                              ],
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.chevron_right, size: 16, color: ZoopColors.textMuted),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildRailBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  // ==========================================
  // TAB 1: ACTIVITY TIMELINE
  // ==========================================
  Widget _buildActivityTab(BuildContext context) {
    final state = ref.watch(activityProvider);
    final notifier = ref.read(activityProvider.notifier);

    final searchQuery = _activitySearchController.text.toLowerCase();
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
              if (_showActivitySearch) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: TextField(
                    controller: _activitySearchController,
                    autofocus: true,
                    style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search activity events...',
                      hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                      prefixIcon: const Icon(Icons.search, size: 18, color: ZoopColors.primaryCyan),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close, size: 16, color: ZoopColors.textMuted),
                        constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                        onPressed: () {
                          _activitySearchController.clear();
                          setState(() => _showActivitySearch = false);
                        },
                      ),
                      filled: true,
                      fillColor: ZoopColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: ZoopColors.surfaceBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: ZoopColors.surfaceBorder)),
                    ),
                    onChanged: (_) => setState(() {}),
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
                              label: Text(cat.label, style: TextStyle(fontSize: 11, color: isSelected ? Colors.black : ZoopColors.textSecondary)),
                              selected: isSelected,
                              onSelected: (_) => notifier.setCategory(cat),
                              backgroundColor: ZoopColors.surface,
                              selectedColor: ZoopColors.primaryCyan,
                              showCheckmark: false,
                              side: BorderSide(color: isSelected ? ZoopColors.primaryCyan : ZoopColors.surfaceBorder),
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                  Semantics(
                    label: _showActivitySearch ? 'Close activity search' : 'Open activity search',
                    button: true,
                    child: IconButton(
                      icon: Icon(_showActivitySearch ? Icons.search_off : Icons.search, size: 20, color: ZoopColors.primaryCyan),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      onPressed: () => setState(() => _showActivitySearch = !_showActivitySearch),
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
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.checklist, size: 56, color: ZoopColors.textMuted.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      const Text('No Activity Events', style: TextStyle(fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                      const SizedBox(height: 4),
                      const Text('Events will record automatically as you use Zoop mesh', style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary)),
                    ],
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
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: ZoopColors.surfaceBorder),
                        ),
                        child: ListTile(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (ctx) => EventDetailSheet(event: event),
                            );
                          },
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: chipColor.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(event.category.icon, color: chipColor, size: 18),
                          ),
                          title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text('${event.relativeTime} • ${event.description}', style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
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

  // ==========================================
  // TAB 2: SECURITY & CRYPTOGRAPHY
  // ==========================================
  Widget _buildSecurityTab(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);
    final settings = ref.watch(settingsProvider);
    final settingsNotifier = ref.read(settingsProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Identity Summary Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('CRYPTO ENCLAVE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0, color: ZoopColors.textMuted)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (identityState.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        identityState.isBackedUp ? 'BACKED UP' : 'BACKUP NEEDED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: identityState.isBackedUp ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  identityState.zoopId ?? 'Generating Identity...',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: ZoopColors.primaryCyan,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Curve25519 root private key sealed on this hardware device',
                  style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                ),
                const SizedBox(height: 16),
                Semantics(
                  label: 'View 24-word cryptographic recovery phrase',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _handleViewRecoveryPhrase,
                      icon: const Icon(Icons.key_rounded, size: 16),
                      label: const Text('View 24-Word Recovery Phrase'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ZoopColors.primaryCyan,
                        side: const BorderSide(color: ZoopColors.primaryCyan),
                        minimumSize: const Size.fromHeight(48),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Security Policies
          _buildSectionHeader('DEVICE PROTECTION', ZoopColors.textMuted),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              children: [
                Semantics(
                  label: 'Security PIN, ${settings.hasPinSet ? "PIN protection is active" : "Set a 6-digit PIN"}. Tap to configure PIN.',
                  button: true,
                  child: ListTile(
                    leading: const Icon(Icons.pin, color: ZoopColors.primaryCyan, size: 22),
                    title: const Text('Security PIN', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                    subtitle: Text(settings.hasPinSet ? 'PIN protection is active' : 'Set a 6-digit PIN', style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                    trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => PinChangeDialog(
                          onPinChanged: (pin) {
                            settingsNotifier.setPin(pin);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('PIN updated successfully'), backgroundColor: ZoopColors.accentGreen),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
                const Divider(color: ZoopColors.surfaceBorder, height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.fingerprint, color: ZoopColors.primaryCyan, size: 22),
                  title: const Text('Biometric Authentication', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                  subtitle: const Text('Unlock with Fingerprint or Face ID', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                  value: settings.biometricsEnabled,
                  activeThumbColor: ZoopColors.primaryCyan,
                  onChanged: (_) => settingsNotifier.toggleBiometrics(),
                ),
                const Divider(color: ZoopColors.surfaceBorder, height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.shield_outlined, color: ZoopColors.accentRose, size: 22),
                  title: const Text('Emergency Kill Switch', style: TextStyle(fontSize: 13, color: ZoopColors.textPrimary)),
                  subtitle: const Text('Block all traffic if VPN disconnects unexpectedly', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                  value: settings.killSwitchEnabled,
                  activeThumbColor: ZoopColors.accentRose,
                  onChanged: (_) => settingsNotifier.toggleKillSwitch(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Network & Probe Diagnostics
          _buildSectionHeader('DIAGNOSTIC PROBES', ZoopColors.textMuted),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Semantics(
              label: 'Run network diagnostics probe. Double tap to start 9-point audit.',
              button: true,
              child: ListTile(
                onTap: () => context.push('/diagnostics'),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.network_check, color: ZoopColors.primaryCyan, size: 20),
                ),
                title: const Text('Network Diagnostics Probe', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary)),
                subtitle: const Text('Run 9-point audit: STUN, NAT, MTU, WireGuard handshake', style: TextStyle(fontSize: 11, color: ZoopColors.textMuted)),
                trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: color,
        ),
      ),
    );
  }
}

typedef VaultScreen = WalletScreen;
