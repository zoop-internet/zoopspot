import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../application/sharing_notifier.dart';
import '../../domain/sharing_models.dart';
import '../widgets/recipient_details_sheet.dart';
import '../widgets/sharing_circles_tab.dart';
import '../widgets/sharing_orb_hero.dart';
import '../widgets/sharing_policy_sheet.dart';
import '../widgets/sharing_qr_modal.dart';
import '../widgets/sharing_recipient_card.dart';
import '../widgets/sharing_requests_tab.dart';

/// Primary Sharing screen providing node hotspot sharing, active relay telemetry,
/// inbound peer approvals, and circles management.
class SharingScreen extends ConsumerStatefulWidget {
  const SharingScreen({super.key});

  @override
  ConsumerState<SharingScreen> createState() => _SharingScreenState();
}

class _SharingScreenState extends ConsumerState<SharingScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _pulseController;
  late AnimationController _rotationController;
  Animation<double>? _pulseAnimation;

  String? _sessionPin;
  String? _inviteLink;

  Animation<double> get pulseAnimation =>
      _pulseAnimation ??= CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      );

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    );

    // Initial credentials if sharing is already active
    final sharingState = ref.read(sharingProvider);
    if (sharingState.isSharingActive) {
      _generateSessionCredentials();
      _pulseController.repeat(reverse: true);
      _rotationController.repeat();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _pulseController.dispose();
    _rotationController.dispose();
    super.dispose();
  }

  void _generateSessionCredentials() {
    final randomNum = 1000 + math.Random().nextInt(9000);
    _sessionPin = 'ZP-$randomNum';
    _inviteLink = 'https://zoop.link/share/$_sessionPin';
  }

  void _handleToggleSharing() {
    final notifier = ref.read(sharingProvider.notifier);
    final currentlyActive = ref.read(sharingProvider).isSharingActive;

    if (!currentlyActive) {
      // Starting sharing -> Generate fresh credentials and start animations
      setState(() {
        _generateSessionCredentials();
      });
      _pulseController.repeat(reverse: true);
      _rotationController.repeat();
      notifier.toggleSharing();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sharing active! PIN generated: $_sessionPin'),
          backgroundColor: ZoopColors.accentGreen,
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      // Stopping sharing
      setState(() {
        _sessionPin = null;
        _inviteLink = null;
      });
      _pulseController.stop();
      _rotationController.stop();
      notifier.toggleSharing();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sharing stopped'),
          backgroundColor: ZoopColors.surfaceElevated,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _showPolicySheet(SharingPolicy currentPolicy) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SharingPolicySheet(
        initialPolicy: currentPolicy,
        onSave: (policy) {
          ref.read(sharingProvider.notifier).updatePolicy(policy);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Sharing policies successfully updated'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
        },
      ),
    );
  }

  void _showRecipientSheet(ConnectedRecipientItem recipient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RecipientDetailsSheet(
        recipient: recipient,
        onRevoke: () {
          ref.read(sharingProvider.notifier).revokeRecipient(recipient.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Session revoked for ${recipient.name}'),
              backgroundColor: ZoopColors.surfaceElevated,
            ),
          );
        },
        onBlock: () {
          ref.read(sharingProvider.notifier).revokeRecipient(recipient.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${recipient.name} blocked from connecting'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        },
      ),
    );
  }

  void _openQrModal() {
    showQrInviteModal(
      context,
      sessionPin: _sessionPin,
      inviteLink: _inviteLink,
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sharingProvider);
    final notifier = ref.read(sharingProvider.notifier);
    final isSharing = state.isSharingActive;

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.all_inclusive_rounded, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Share',
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
            icon: const Icon(Icons.tune, color: ZoopColors.textSecondary),
            tooltip: 'Sharing Policies',
            onPressed: () => _showPolicySheet(state.policy),
          ),
          const SizedBox(width: 6),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
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
              indicatorColor: ZoopColors.primaryCyan,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              dividerColor: Colors.transparent,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Peers'),
                      if (state.recipients.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: ZoopColors.accentGreen,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${state.recipients.length}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Colors.black,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Requests'),
                      if (state.pendingRequests.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: ZoopColors.primaryCyan,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${state.pendingRequests.length}',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Colors.black,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(
                  child: Text('Circles & Groups'),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: TabBarView(
          controller: _tabController,
          physics: const BouncingScrollPhysics(),
          children: [
            // Tab 1: Active Connected Peers (Hero at the top, followed by peers list)
            _buildActivePeersTab(state, notifier, isSharing),

            // Tab 2: Inbound Requests Approvals Screen
            SharingRequestsTab(
              requests: state.pendingRequests,
              onApprove: (id) => notifier.approveRequest(id),
              onReject: (id) => notifier.rejectRequest(id),
            ),

            // Tab 3: Circles & Groups Tab
            const SharingCirclesTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildActivePeersTab(
    SharingState state,
    SharingNotifier notifier,
    bool isSharing,
  ) {
    return ListView(
      padding: ZoopSpacing.screenPadding,
      physics: const BouncingScrollPhysics(),
      children: [
        // Hero Node at top of Peers tab
        SharingOrbHero(
          isSharing: isSharing,
          state: state,
          onToggleSharing: _handleToggleSharing,
          pulseAnimation: pulseAnimation,
          rotationController: _rotationController,
          sessionPin: _sessionPin,
          inviteLink: _inviteLink,
          onShowQr: _openQrModal,
        ),

        ZoopSpacing.gapLg,

        if (state.recipients.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24.0),
            child: ZoopEmptyState(
              icon: Icons.sensors_off_rounded,
              title: 'No Peers Connected',
              description: 'Friends who connect via your PIN or QR code will appear here live.',
              primaryActionLabel: isSharing ? 'Show QR Code' : 'Start Sharing',
              primaryActionIcon: isSharing ? Icons.qr_code_2_rounded : Icons.wifi_tethering,
              onPrimaryAction: isSharing ? _openQrModal : _handleToggleSharing,
            ),
          )
        else ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'CONNECTED PEERS (${state.recipients.length})',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: ZoopColors.textMuted,
                ),
              ),
              Text(
                '${state.currentEgressMbps.toStringAsFixed(1)} Mbps total',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: ZoopColors.accentGreen,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (final recipient in state.recipients) ...[
            SharingRecipientCard(
              key: ValueKey(recipient.id),
              recipient: recipient,
              onTap: () => _showRecipientSheet(recipient),
              onDisconnect: () => notifier.revokeRecipient(recipient.id),
            ),
            const SizedBox(height: 10),
          ],
        ],
      ],
    );
  }
}
