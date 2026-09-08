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
import '../../../wallet/application/wallet_notifier.dart';
import '../../../wallet/presentation/widgets/add_funds_sheet.dart';
import '../../../wallet/presentation/widgets/withdraw_sheet.dart';

class VaultScreen extends ConsumerStatefulWidget {
  const VaultScreen({super.key});

  @override
  ConsumerState<VaultScreen> createState() => _VaultScreenState();
}

class _VaultScreenState extends ConsumerState<VaultScreen>
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
        onConfirm: (amount) {
          ref.read(walletProvider.notifier).addFunds(amount, 'USDC (Polygon)');
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Added \$${amount.toStringAsFixed(2)} to balance'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
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
        onConfirm: (amount, dest) {
          ref.read(walletProvider.notifier).withdrawEarnings(amount, dest);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Withdrawal of \$${amount.toStringAsFixed(2)} initiated'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
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
        title: const Row(
          children: [
            Icon(Icons.shield, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Vault & Security',
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
            icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
            tooltip: 'App Settings',
            onPressed: () => context.push('/settings'),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            height: 38,
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: ZoopColors.primaryCyan.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.5)),
              ),
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              tabs: const [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.account_balance_wallet_outlined, size: 16),
                      SizedBox(width: 6),
                      Text('Wallet'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.timeline, size: 16),
                      SizedBox(width: 6),
                      Text('Activity'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock_outline, size: 16),
                      SizedBox(width: 6),
                      Text('Security'),
                    ],
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
          // Tab 0: Wallet
          _buildWalletTab(context),
          // Tab 1: Activity
          _buildActivityTab(context),
          // Tab 2: Security
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
                  '\$${state.availableBalanceUsd.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: ZoopColors.textPrimary, letterSpacing: -0.5),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _showAddFunds(context),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Funds', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.primaryCyan,
                      foregroundColor: ZoopColors.background,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
                          '\$${state.totalEarnedSharingUsd.toStringAsFixed(2)}',
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
                          '\$${state.unwithdrawnEarningsUsd.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () => _showWithdraw(context, state.unwithdrawnEarningsUsd),
                      icon: const Icon(Icons.arrow_outward, size: 16),
                      label: const Text('Withdraw', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.surfaceElevated,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
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
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: tx.type.color.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(tx.type.icon, color: tx.type.color, size: 18),
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
                  ],
                ),
              );
            }),
        ],
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
                  IconButton(
                    icon: Icon(_showActivitySearch ? Icons.search_off : Icons.search, size: 20, color: ZoopColors.primaryCyan),
                    onPressed: () => setState(() => _showActivitySearch = !_showActivitySearch),
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
                    return Container(
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
                Text(
                  'Curve25519 root private key sealed on this hardware device',
                  style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _handleViewRecoveryPhrase,
                    icon: const Icon(Icons.key_rounded, size: 16),
                    label: const Text('View 24-Word Recovery Phrase'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ZoopColors.primaryCyan,
                      side: const BorderSide(color: ZoopColors.primaryCyan),
                      padding: const EdgeInsets.symmetric(vertical: 12),
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
                ListTile(
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

