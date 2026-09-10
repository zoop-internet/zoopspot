import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/biometric_auth_service.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../../core/widgets/zoop_offline_banner.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../activity/application/activity_notifier.dart';
import '../../../activity/presentation/widgets/event_detail_sheet.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../../identity/presentation/widgets/recovery_phrase_sheet.dart';
import '../../../settings/application/settings_notifier.dart';
import '../../application/wallet_notifier.dart';
import '../widgets/add_funds_sheet.dart';
import '../widgets/payment_brand_icon.dart';
import '../widgets/transaction_detail_sheet.dart';
import '../widgets/wallet_activity_tab.dart';
import '../widgets/wallet_balance_card.dart';
import '../widgets/wallet_earnings_card.dart';
import '../widgets/wallet_security_tab.dart';
import '../widgets/wallet_settlement_card.dart';
import '../widgets/withdraw_sheet.dart';

/// Primary Wallet screen covering prepaid balance, sharing node earnings,
/// activity audit trails, and crypto enclave recovery.
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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        ZoopFeedback.selection();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _activitySearchController.dispose();
    super.dispose();
  }

  void _showAddFunds(BuildContext context) {
    ZoopFeedback.selection();
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
          final formattedAmount =
              'UGX ${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
          try {
            if (method.toLowerCase().contains('card')) {
              final res = await notifier.addFundsViaCard(amount: amount);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                        'Card checkout initiated for $formattedAmount. Reference: ${res.reference}'),
                    backgroundColor: ZoopColors.primaryCyan,
                  ),
                );
              }
            } else {
              final phone = phoneNumber ?? '';
              await notifier.addFundsViaMobileMoney(
                amount: amount,
                phoneNumber: phone,
                provider: method.toLowerCase().contains('mtn') ? 'mtn' : 'airtel',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                        'Prompt sent to $phone for $formattedAmount. Approve on your phone.'),
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
    ZoopFeedback.selection();
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
          final formattedAmount =
              'UGX ${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
          try {
            final res = await notifier.withdrawToMobileMoney(
              amount: amount,
              phoneNumber: phoneNumber,
              provider: provider.toLowerCase().contains('mtn') ? 'mtn' : 'airtel',
            );
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                      'Withdrawal of $formattedAmount to $phoneNumber initiated (${res.reference})'),
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
    final identityState = ref.watch(identityNotifierProvider);
    final settings = ref.watch(settingsProvider);
    final settingsNotifier = ref.read(settingsProvider.notifier);
    final activityState = ref.watch(activityProvider);
    final activityNotifier = ref.read(activityProvider.notifier);

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
            label: 'Add funds to Zoop wallet',
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
              tabs: [
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
          WalletActivityTab(
            state: activityState,
            notifier: activityNotifier,
            searchController: _activitySearchController,
            showSearch: _showActivitySearch,
            onToggleSearch: () => setState(() => _showActivitySearch = !_showActivitySearch),
            onClearSearch: () {
              _activitySearchController.clear();
              setState(() => _showActivitySearch = false);
            },
            onSelectEvent: (event) {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (ctx) => EventDetailSheet(event: event),
              );
            },
          ),
          // Tab 2: Security & Keys
          WalletSecurityTab(
            identityState: identityState,
            settings: settings,
            settingsNotifier: settingsNotifier,
            onViewRecoveryPhrase: _handleViewRecoveryPhrase,
            onDiagnostics: () => context.push('/diagnostics'),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 0: WALLET & EARNINGS
  // ==========================================
  Widget _buildWalletTab(BuildContext context) {
    final state = ref.watch(walletProvider);

    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: () => ref.read(walletProvider.notifier).refreshAll(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (state.errorMessage != null)
              ZoopErrorBanner(
                title: 'Wallet Sync Notice',
                message: state.errorMessage!,
                onRetry: () => ref.read(walletProvider.notifier).refreshAll(),
              ),
            if (state.isOffline)
              ZoopOfflineBanner(
                onReconnect: () => ref.read(walletProvider.notifier).refreshAll(),
              ),
            if (state.isLoading && state.transactions.isEmpty) ...[
              const ZoopSkeletonCard(height: 170),
              ZoopSpacing.gapLg,
              const ZoopSkeletonCard(height: 180),
              ZoopSpacing.gapXxl,
              _buildSectionHeader('TRANSACTION HISTORY', ZoopColors.textMuted),
              const SizedBox(height: 10),
              const ZoopSkeletonListTile(height: 68),
              const ZoopSkeletonListTile(height: 68),
              const ZoopSkeletonListTile(height: 68),
            ] else ...[
              // Available Mesh Balance Card
              WalletBalanceCard(
                state: state,
                onAddFunds: () => _showAddFunds(context),
              ),
              ZoopSpacing.gapLg,

              // Provider Earnings Card
              WalletEarningsCard(
                state: state,
                onWithdraw: () => _showWithdraw(context, state.unwithdrawnEarnings),
              ),
              ZoopSpacing.gapLg,

              // Settlement Rails Info
              const WalletSettlementCard(),
              ZoopSpacing.gapXxl,

              // Transaction History Header
              _buildSectionHeader('TRANSACTION HISTORY', ZoopColors.textMuted),
              const SizedBox(height: 10),
              if (state.transactions.isEmpty)
                ZoopEmptyState(
                  icon: Icons.receipt_long_rounded,
                  title: 'No Transactions Recorded Yet',
                  description:
                      'Top up your Zoop balance using MTN Mobile Money, Airtel Money, or Card, or share internet to start earning.',
                  primaryActionLabel: 'Add Funds',
                  primaryActionIcon: Icons.add_circle_outline,
                  onPrimaryAction: () => _showAddFunds(context),
                )
              else
                ...state.transactions.map((tx) {
                  return Semantics(
                    key: ValueKey(tx.id),
                    label:
                        '${tx.type.label}, ${tx.description}, ${tx.formattedAmount}, status ${tx.status.name}. Tap to view transaction receipt.',
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
                                ZoopSpacing.gapMd,
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        tx.type.label,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: ZoopColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        tx.description,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: ZoopColors.textMuted,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      tx.formattedAmount,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: tx.type.color,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(tx.status.icon, size: 10, color: tx.status.color),
                                        const SizedBox(width: 3),
                                        Text(
                                          tx.status.name.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                            color: tx.status.color,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 6),
                                const Icon(
                                  Icons.chevron_right,
                                  size: 16,
                                  color: ZoopColors.textMuted,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          ],
        ),
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
