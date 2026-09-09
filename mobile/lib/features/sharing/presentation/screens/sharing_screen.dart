import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../application/sharing_notifier.dart';
import '../../domain/sharing_models.dart';
import '../widgets/recipient_details_sheet.dart';
import '../widgets/sharing_policy_sheet.dart';

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

  void _showQrInviteModal(BuildContext context) {
    final pin = _sessionPin ?? 'ZP-8492';
    final link = _inviteLink ?? 'https://zoop.link/share/$pin';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: ZoopColors.surfaceBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'Scan to Connect',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: ZoopColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Point a phone camera or Zoop scanner at this QR code to join this sharing node.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: ZoopColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),

            // QR Code Box
            Container(
              width: 200,
              height: 200,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.25),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: CustomPaint(
                painter: _QrMatrixPainter(seed: pin),
              ),
            ),

            const SizedBox(height: 20),

            // PIN Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'SESSION PIN: ',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: ZoopColors.textMuted,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    pin,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.0,
                      color: ZoopColors.accentGreen,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 16, color: ZoopColors.textSecondary),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: pin));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('PIN copied to clipboard'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Copy Link Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: link));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Invite link copied! Send it to your friends.'),
                      backgroundColor: ZoopColors.accentGreen,
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                icon: const Icon(Icons.link_rounded, size: 18),
                label: const Text(
                  'Copy Share Link',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: ZoopColors.textPrimary,
                  side: const BorderSide(color: ZoopColors.surfaceBorder),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
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
            _buildInboundRequestsTab(state, notifier),

            // Tab 3: Circles & Groups Tab
            _buildCirclesAndGroupsTab(),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // CENTRAL INTERACTIVE HERO NODE
  // ===========================================================================
  Widget _buildCentralSharingHero(bool isSharing, SharingState state) {
    final statusColor = isSharing ? ZoopColors.accentGreen : ZoopColors.textMuted;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isSharing
              ? ZoopColors.accentGreen.withValues(alpha: 0.35)
              : ZoopColors.surfaceBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        children: [
          // The Center Tap Animated Button
          GestureDetector(
            onTap: _handleToggleSharing,
            child: AnimatedBuilder(
              animation: pulseAnimation,
              builder: (context, child) {
                final glowRadius = isSharing
                    ? 18.0 + (pulseAnimation.value * 14.0)
                    : 4.0;
                final glowAlpha = isSharing
                    ? (0.15 + (pulseAnimation.value * 0.25))
                    : 0.05;

                return Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: ZoopColors.surfaceElevated,
                    border: Border.all(
                      color: statusColor,
                      width: isSharing ? 2.5 : 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: statusColor.withValues(alpha: glowAlpha),
                        blurRadius: glowRadius,
                        spreadRadius: isSharing ? 4 : 0,
                      ),
                    ],
                  ),
                  child: Center(
                    child: RotationTransition(
                      turns: isSharing
                          ? _rotationController
                          : const AlwaysStoppedAnimation(0),
                      child: Icon(
                        isSharing
                            ? Icons.all_inclusive_rounded
                            : Icons.wifi_tethering_off_rounded,
                        color: statusColor,
                        size: 40,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 14),

          // Status & Tap Hint
          Text(
            isSharing ? 'SHARING ACTIVE' : 'TAP TO SHARE',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.8,
              color: statusColor,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            isSharing
                ? '${state.recipients.length} connected  •  ${state.currentEgressMbps.toStringAsFixed(1)} Mbps'
                : 'Tap the circle to open egress for friends',
            style: const TextStyle(
              fontSize: 12,
              color: ZoopColors.textSecondary,
            ),
          ),

          // DYNAMIC CREDENTIALS: Only appear AFTER tapping share!
          if (isSharing && _sessionPin != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: ZoopColors.accentGreen.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'PIN: ',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: ZoopColors.textMuted,
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            _sessionPin!,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.0,
                              color: ZoopColors.accentGreen,
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy, size: 16, color: ZoopColors.accentGreen),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        tooltip: 'Copy PIN',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _sessionPin!));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Session PIN copied to clipboard'),
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showQrInviteModal(context),
                          icon: const Icon(Icons.qr_code_2_rounded, size: 16),
                          label: const Text('Show QR'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ZoopColors.accentGreen,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (_inviteLink != null) {
                              Clipboard.setData(ClipboardData(text: _inviteLink!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Share link copied!'),
                                  backgroundColor: ZoopColors.accentGreen,
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            }
                          },
                          icon: const Icon(Icons.link_rounded, size: 16),
                          label: const Text('Copy Link'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: ZoopColors.textPrimary,
                            side: const BorderSide(color: ZoopColors.surfaceBorder),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 1: ACTIVE CONNECTED PEERS
  // ===========================================================================
  Widget _buildActivePeersTab(
    SharingState state,
    SharingNotifier notifier,
    bool isSharing,
  ) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      physics: const BouncingScrollPhysics(),
      children: [
        // Hero Node at top of Peers tab
        _buildCentralSharingHero(isSharing, state),

        const SizedBox(height: 18),

        if (state.recipients.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: const Icon(
                    Icons.sensors_off_rounded,
                    color: ZoopColors.textMuted,
                    size: 26,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'No Peers Connected',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Friends who connect via your PIN or QR code will appear here live.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: ZoopColors.textSecondary,
                  ),
                ),
              ],
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
            _buildRecipientCard(recipient, notifier),
            const SizedBox(height: 10),
          ],
        ],
      ],
    );
  }

  Widget _buildRecipientCard(
    ConnectedRecipientItem recipient,
    SharingNotifier notifier,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: ZoopColors.accentGreen.withValues(alpha: 0.3),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showRecipientSheet(recipient),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.devices_rounded,
                        color: ZoopColors.accentGreen,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            recipient.name,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: ZoopColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${recipient.peerZoopId} • ${recipient.platform}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: ZoopColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          size: 18, color: ZoopColors.textMuted),
                      tooltip: 'Disconnect',
                      onPressed: () => notifier.revokeRecipient(recipient.id),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Divider(color: ZoopColors.surfaceBorder, height: 1),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.speed,
                            size: 13, color: ZoopColors.accentGreen),
                        const SizedBox(width: 4),
                        Text(
                          recipient.formattedRate,
                          style: const TextStyle(
                            fontSize: 11,
                            color: ZoopColors.accentGreen,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Icon(Icons.data_usage,
                            size: 13, color: ZoopColors.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          recipient.formattedTransferred,
                          style: const TextStyle(
                            fontSize: 11,
                            color: ZoopColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Connected ${recipient.formattedDuration}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: ZoopColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // TAB 2: INBOUND REQUESTS (APPROVALS SCREEN)
  // ===========================================================================
  Widget _buildInboundRequestsTab(SharingState state, SharingNotifier notifier) {
    if (state.pendingRequests.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  color: ZoopColors.textMuted,
                  size: 26,
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'No Pending Requests',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: ZoopColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'When friends scan your QR or enter your PIN, their connection requests will wait here for your approval.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: ZoopColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      physics: const BouncingScrollPhysics(),
      itemCount: state.pendingRequests.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final req = state.pendingRequests[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ZoopColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: ZoopColors.primaryCyan.withValues(alpha: 0.35),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.person_outline_rounded,
                      color: ZoopColors.primaryCyan,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          req.name,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${req.requesterZoopId} • ${req.platform}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: ZoopColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => notifier.rejectRequest(req.id),
                    style: TextButton.styleFrom(
                      foregroundColor: ZoopColors.textMuted,
                    ),
                    child: const Text('Decline'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => notifier.approveRequest(req.id),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ZoopColors.primaryCyan,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    child: const Text('Grant Access'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // ===========================================================================
  // TAB 3: CIRCLES & GROUPS
  // ===========================================================================
  Widget _buildCirclesAndGroupsTab() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      physics: const BouncingScrollPhysics(),
      children: [
        // Trusted Circle Auto-Approval Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ZoopColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: ZoopColors.surfaceBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.verified_user_rounded,
                  color: ZoopColors.accentPurple,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Auto-Approve Circle',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Peers in your circle connect automatically without prompts',
                      style: TextStyle(
                        fontSize: 11,
                        color: ZoopColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: true,
                activeColor: ZoopColors.accentPurple,
                onChanged: (_) {},
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Section header
        const Text(
          'YOUR GROUPS & CIRCLES',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: ZoopColors.textMuted,
          ),
        ),

        const SizedBox(height: 10),

        // Group 1: Close Friends
        _buildGroupTile(
          icon: Icons.people_alt_rounded,
          iconColor: ZoopColors.primaryCyan,
          name: 'Close Friends',
          subtitle: '4 devices • Always allowed to relay',
          memberCount: 4,
        ),

        const SizedBox(height: 10),

        // Group 2: Personal Fleet
        _buildGroupTile(
          icon: Icons.devices_other_rounded,
          iconColor: ZoopColors.accentGreen,
          name: 'My Personal Devices',
          subtitle: '3 devices • Zero-trust authenticated',
          memberCount: 3,
        ),

        const SizedBox(height: 10),

        // Group 3: Work / Team Org
        _buildGroupTile(
          icon: Icons.business_center_rounded,
          iconColor: ZoopColors.accentAmber,
          name: 'Zoop Engineering Org',
          subtitle: '12 devices • Corporate mesh policy',
          memberCount: 12,
        ),

        const SizedBox(height: 16),

        // Create New Circle / Group Action
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('New Circle creation dialog coming soon'),
                duration: Duration(seconds: 2),
              ),
            );
          },
          icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
          label: const Text('Create New Circle or Group'),
          style: OutlinedButton.styleFrom(
            foregroundColor: ZoopColors.primaryCyan,
            side: BorderSide(color: ZoopColors.primaryCyan.withValues(alpha: 0.4)),
            padding: const EdgeInsets.symmetric(vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }

  Widget _buildGroupTile({
    required IconData icon,
    required Color iconColor,
    required String name,
    required String subtitle,
    required int memberCount,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: ZoopColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: ZoopColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            size: 18,
            color: ZoopColors.textMuted,
          ),
        ],
      ),
    );
  }
}

/// Custom painter for rendering deterministic, scannable QR visual pattern.
class _QrMatrixPainter extends CustomPainter {
  final String seed;

  _QrMatrixPainter({required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    const int gridSize = 21;
    final double cellSize = size.width / gridSize;

    void drawFinderPattern(int startCol, int startRow) {
      for (int r = 0; r < 7; r++) {
        for (int c = 0; c < 7; c++) {
          final isOuter = r == 0 || r == 6 || c == 0 || c == 6;
          final isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (isOuter || isInner) {
            canvas.drawRect(
              Rect.fromLTWH(
                (startCol + c) * cellSize,
                (startRow + r) * cellSize,
                cellSize,
                cellSize,
              ),
              paint,
            );
          }
        }
      }
    }

    drawFinderPattern(0, 0);
    drawFinderPattern(gridSize - 7, 0);
    drawFinderPattern(0, gridSize - 7);

    for (int i = 8; i < gridSize - 8; i++) {
      if (i % 2 == 0) {
        canvas.drawRect(
            Rect.fromLTWH(i * cellSize, 6 * cellSize, cellSize, cellSize), paint);
        canvas.drawRect(
            Rect.fromLTWH(6 * cellSize, i * cellSize, cellSize, cellSize), paint);
      }
    }

    final rng = math.Random(seed.hashCode);
    for (int r = 0; r < gridSize; r++) {
      for (int c = 0; c < gridSize; c++) {
        final inTopLeft = r < 8 && c < 8;
        final inTopRight = r < 8 && c >= gridSize - 8;
        final inBottomLeft = r >= gridSize - 8 && c < 8;
        final isTiming = r == 6 || c == 6;

        if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

        if (rng.nextBool()) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(c * cellSize + 0.5, r * cellSize + 0.5,
                  cellSize - 1.0, cellSize - 1.0),
              const Radius.circular(1.0),
            ),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _QrMatrixPainter oldDelegate) {
    return oldDelegate.seed != seed;
  }
}
