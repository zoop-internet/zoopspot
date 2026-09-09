import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/models/peer_device.dart';
import '../../../../core/models/routing_mode.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/vpn/vpn_bridge_service.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../application/peers_notifier.dart';
import '../widgets/connection_details_sheet.dart';
import '../widgets/provider_selection_sheet.dart';
import '../../../fleet/presentation/widgets/device_pairing_sheet.dart';
import '../../../diagnostics/domain/diagnostic_models.dart';
import '../../../diagnostics/application/diagnostics_notifier.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen>
    with TickerProviderStateMixin {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  final RoutingMode _routingMode = RoutingMode.fullInternet;
  String _connectingStep = 'Connecting...';

  late AnimationController _rotationController;
  late AnimationController _pulseController;
  Animation<double>? _pulseAnimation;
  StreamSubscription? _vpnEventSubscription;

  Animation<double> get pulseAnimation =>
      _pulseAnimation ??= CurvedAnimation(
        parent: _pulseController,
        curve: Curves.easeInOut,
      );

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkInitialVpnStatus();
      _listenToVpnEvents();
    });
  }

  @override
  void dispose() {
    _vpnEventSubscription?.cancel();
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _checkInitialVpnStatus() async {
    final vpnBridge = ref.read(vpnBridgeServiceProvider);
    final isRunning = await vpnBridge.isTunnelRunning();
    if (isRunning && mounted) {
      setState(() {
        _status = ConnectionStatus.connectedDirect;
      });
      _pulseController.repeat(reverse: true);
    }
  }

  void _listenToVpnEvents() {
    final vpnBridge = ref.read(vpnBridgeServiceProvider);
    _vpnEventSubscription = vpnBridge.vpnEvents.listen((event) {
      if (!mounted) return;
      final type = event['type'] as String?;
      if (type == 'state_change') {
        final state = event['state'] as String?;
        final isDirect = event['isDirect'] as bool? ?? true;
        setState(() {
          if (state == 'connected') {
            _status = isDirect
                ? ConnectionStatus.connectedDirect
                : ConnectionStatus.connectedRelay;
            _rotationController.stop();
            _pulseController.repeat(reverse: true);
          } else if (state == 'disconnected') {
            _status = ConnectionStatus.disconnected;
            _rotationController.stop();
            _pulseController.stop();
          } else if (state == 'roaming') {
            _status = ConnectionStatus.roaming;
          }
        });
      } else if (type == 'error') {
        final message = event['message'] as String? ?? 'Network error';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: ZoopColors.accentRose,
          ),
        );
      }
    });
  }

  Future<void> _toggleConnection() async {
    final vpnBridge = ref.read(vpnBridgeServiceProvider);
    final peersState = ref.read(peersNotifierProvider);

    if (_status == ConnectionStatus.disconnected) {
      final targetPeer = peersState.selectedPeer ??
          (peersState.peers.isNotEmpty ? peersState.peers.first : null);

      if (targetPeer == null) {
        ProviderSelectionSheet.show(context);
        return;
      }

      setState(() {
        _status = ConnectionStatus.connecting;
        _connectingStep = 'Connecting...';
      });

      _rotationController.repeat();
      _pulseController.repeat(reverse: true);

      final prepared = await vpnBridge.prepareVpn();
      if (!prepared) {
        if (mounted) {
          setState(() {
            _status = ConnectionStatus.disconnected;
          });
          _rotationController.stop();
          _pulseController.stop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('VPN permission was denied'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        }
        return;
      }

      // 1. Resolve peer details
      final resolved = await ref
          .read(peersNotifierProvider.notifier)
          .resolvePeerDetails(targetPeer);
      final peerKey = resolved?.wireguardPublicKey ?? '';
      final candidatesJson = json.encode(resolved?.endpoints ?? []);
      const relayUrl = 'wss://3.70.135.200.sslip.io/v1/relay';

      // 2. Control plane session
      try {
        final endpointId = ref.read(identityNotifierProvider).endpointId;
        final storage = ref.read(secureStorageServiceProvider);
        final client = ref.read(cloudApiClientProvider);
        final seed = await storage.getEd25519SeedBytes();
        if (endpointId != null && seed != null) {
          await client.createConnection(
            endpointId: endpointId,
            targetDeviceId: targetPeer.id.isNotEmpty
                ? targetPeer.id
                : targetPeer.endpointId,
            privateKeySeed: seed,
          );
        }
      } catch (_) {}

      // 3. Start tunnel
      await vpnBridge.startTunnel(
        peerKey: peerKey,
        candidatesJson: candidatesJson,
        relayUrl: relayUrl,
        routingMode: _routingMode.wireRouteParam,
      );

      if (mounted) {
        setState(() {
          _status = ConnectionStatus.connectedDirect;
        });
        _rotationController.stop();
        _pulseController.repeat(reverse: true);
      }
    } else {
      await vpnBridge.stopTunnel();
      if (mounted) {
        setState(() {
          _status = ConnectionStatus.disconnected;
        });
        _rotationController.stop();
        _pulseController.stop();
      }
    }
  }

  Color get _statusColor {
    switch (_status) {
      case ConnectionStatus.connectedDirect:
        return ZoopColors.directP2P;
      case ConnectionStatus.connectedRelay:
        return ZoopColors.relay;
      case ConnectionStatus.connecting:
        return ZoopColors.connecting;
      case ConnectionStatus.roaming:
        return ZoopColors.roaming;
      default:
        return ZoopColors.textMuted;
    }
  }

  void _showPairDeviceModal() {
    final identity = ref.read(identityNotifierProvider);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DevicePairingSheet(
        deviceName: 'Android Device (${identity.zoopId ?? "ZP-Node"})',
        deviceId: identity.endpointId ?? 'ep-local-device',
      ),
    );
  }

  IconData _getPlatformIcon(String platform) {
    final p = platform.toLowerCase();
    if (p.contains('android')) return Icons.phone_android_rounded;
    if (p.contains('darwin') || p.contains('ios') || p.contains('mac')) {
      return Icons.laptop_mac_rounded;
    }
    if (p.contains('windows')) return Icons.desktop_windows_rounded;
    if (p.contains('router') || p.contains('openwrt')) {
      return Icons.router_rounded;
    }
    return Icons.dns_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);
    final peersState = ref.watch(peersNotifierProvider);
    final activePeer = peersState.selectedPeer ??
        (peersState.peers.isNotEmpty ? peersState.peers.first : null);

    final isConnected = _status.isConnected;
    final isConnecting = _status == ConnectionStatus.connecting;

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        titleSpacing: 16,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [ZoopColors.primaryCyan, ZoopColors.primaryCyanDark],
                ),
              ),
              child: const Center(
                child: Text(
                  'Z',
                  style: TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.w900,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'ZOOP',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 17,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
              decoration: BoxDecoration(
                color: identityState.isRegistered
                    ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                    : ZoopColors.accentAmber.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: identityState.isRegistered
                      ? ZoopColors.accentGreen.withValues(alpha: 0.4)
                      : ZoopColors.accentAmber.withValues(alpha: 0.4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: identityState.isRegistered
                          ? ZoopColors.accentGreen
                          : ZoopColors.accentAmber,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    identityState.isRegistered ? 'ONLINE' : 'SYNCING',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: identityState.isRegistered
                          ? ZoopColors.accentGreen
                          : ZoopColors.accentAmber,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (identityState.zoopId != null)
            GestureDetector(
              onTap: () => context.push('/identity'),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: ZoopColors.primaryCyan,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      identityState.zoopId!,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: ZoopColors.primaryCyan,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.notifications_outlined,
                  color: ZoopColors.textSecondary,
                  size: 21,
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: ZoopColors.primaryCyan,
                    ),
                  ),
                ),
              ],
            ),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            tooltip: 'Notifications',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const NotificationsScreen(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(
              Icons.settings_outlined,
              color: ZoopColors.textSecondary,
              size: 20,
            ),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Zoop Points Required to Participate Card
              _buildZoopPointsCard(context),

              const SizedBox(height: 16),

              // ===============================================================
              // CARD 1: DEVICE-TO-DEVICE CONNECTION VISUALIZER
              // ===============================================================
              _buildDeviceMeshCard(context, activePeer, isConnected, isConnecting),

              const SizedBox(height: 16),

              // ===============================================================
              // SEPARATE DEDICATED CONNECT BUTTON
              // ===============================================================
              _buildConnectActionButton(isConnected, isConnecting),

              const SizedBox(height: 24),

              // Ecosystem Quick Actions
              _buildQuickActions(context),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // CARD 1: DEVICE-TO-DEVICE VISUALIZER (This Device -> Ring -> Target Node)
  // ===========================================================================
  Widget _buildDeviceMeshCard(
    BuildContext context,
    PeerDevice? activePeer,
    bool isConnected,
    bool isConnecting,
  ) {
    final statusColor = isConnected
        ? ZoopColors.accentGreen
        : (isConnecting ? ZoopColors.primaryCyan : ZoopColors.textMuted);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28.0, horizontal: 16.0),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isConnected
              ? ZoopColors.accentGreen.withValues(alpha: 0.35)
              : ZoopColors.surfaceBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        children: [
          // Device to Device P2P Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. Left: This Device
              _buildDeviceNode(
                icon: Icons.phone_android_rounded,
                name: 'This Phone',
                isActive: true,
                statusColor: isConnected
                    ? ZoopColors.accentGreen
                    : ZoopColors.primaryCyan,
              ),

              // 2. Animated Left-to-Center Line
              Expanded(
                child: _buildConnectionBeam(
                  isActive: isConnected || isConnecting,
                  color: statusColor,
                ),
              ),

              // 3. Center Rotating Mesh Ring
              _buildCenterMeshRing(statusColor, isConnected, isConnecting),

              // 4. Animated Center-to-Right Line
              Expanded(
                child: _buildConnectionBeam(
                  isActive: isConnected,
                  color: isConnected ? ZoopColors.accentGreen : ZoopColors.surfaceBorder,
                ),
              ),

              // 5. Right: Target Peer Node (Tappable to Select)
              GestureDetector(
                onTap: () => ProviderSelectionSheet.show(context),
                child: _buildDeviceNode(
                  icon: activePeer != null
                      ? _getPlatformIcon(activePeer.platform)
                      : Icons.laptop_mac_rounded,
                  name: activePeer?.name ?? 'Select Node',
                  isActive: isConnected,
                  isTarget: true,
                  statusColor: isConnected
                      ? ZoopColors.accentGreen
                      : ZoopColors.textSecondary,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Simple Status Text
          Text(
            isConnected
                ? 'Connected'
                : (isConnecting ? 'Connecting...' : 'Not Connected'),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: statusColor,
              letterSpacing: 0.2,
            ),
          ),
          if (isConnected && activePeer != null) ...[
            const SizedBox(height: 4),
            Text(
              'Linked to ${activePeer.name}',
              style: const TextStyle(
                fontSize: 12,
                color: ZoopColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeviceNode({
    required IconData icon,
    required String name,
    required bool isActive,
    required Color statusColor,
    bool isTarget = false,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isActive ? statusColor : ZoopColors.surfaceBorder,
                  width: 1.5,
                ),
              ),
              child: Icon(icon, color: statusColor, size: 24),
            ),
            if (isTarget)
              Container(
                padding: const EdgeInsets.all(3),
                decoration: const BoxDecoration(
                  color: ZoopColors.surface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.unfold_more,
                  size: 13,
                  color: ZoopColors.primaryCyan,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 80,
          child: Text(
            name,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isActive ? ZoopColors.textPrimary : ZoopColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCenterMeshRing(
    Color statusColor,
    bool isConnected,
    bool isConnecting,
  ) {
    return RotationTransition(
      turns: isConnecting
          ? _rotationController
          : const AlwaysStoppedAnimation(0),
      child: AnimatedBuilder(
        animation: pulseAnimation,
        builder: (context, child) {
          final glowAlpha = isConnected
              ? (0.2 + (pulseAnimation.value * 0.25))
              : (isConnecting ? 0.3 : 0.05);

          return Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: ZoopColors.surfaceElevated,
              border: Border.all(
                color: statusColor,
                width: 2.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: statusColor.withValues(alpha: glowAlpha),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Icon(
              isConnected
                  ? Icons.check_circle_rounded
                  : (isConnecting ? Icons.sync : Icons.sensors),
              size: 22,
              color: statusColor,
            ),
          );
        },
      ),
    );
  }

  Widget _buildConnectionBeam({
    required bool isActive,
    required Color color,
  }) {
    return Container(
      height: 2.5,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.4),
                  blurRadius: 4,
                ),
              ]
            : null,
      ),
    );
  }

  // ===========================================================================
  // SEPARATE CONNECT ACTION BUTTON
  // ===========================================================================
  Widget _buildConnectActionButton(bool isConnected, bool isConnecting) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        onPressed: isConnecting ? null : _toggleConnection,
        style: ElevatedButton.styleFrom(
          backgroundColor: isConnected
              ? ZoopColors.surfaceElevated
              : ZoopColors.primaryCyan,
          foregroundColor:
              isConnected ? ZoopColors.accentRose : Colors.black,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isConnected
                  ? ZoopColors.accentRose.withValues(alpha: 0.5)
                  : Colors.transparent,
              width: 1.2,
            ),
          ),
        ),
        icon: isConnecting
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.black,
                ),
              )
            : Icon(
                isConnected ? Icons.power_settings_new : Icons.bolt_rounded,
                size: 20,
              ),
        label: Text(
          isConnected
              ? 'Disconnect'
              : (isConnecting ? 'Connecting...' : 'Connect'),
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: isConnected ? ZoopColors.accentRose : Colors.black,
            letterSpacing: 0.3,
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // ECOSYSTEM QUICK ACTIONS
  // ===========================================================================
  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: ZoopColors.textSecondary,
          ),
        ),
        const SizedBox(height: 10),
        _buildActionTile(
          context,
          icon: Icons.wifi_tethering,
          iconColor: ZoopColors.accentGreen,
          title: 'Share Bandwidth',
          subtitle: 'Provide access to trusted peers and earn credits',
          onTap: () => context.go('/sharing'),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          context,
          icon: Icons.qr_code_scanner,
          iconColor: ZoopColors.primaryCyan,
          title: 'Pair New Device',
          subtitle: 'Link laptop, tablet, or gateway in seconds',
          onTap: _showPairDeviceModal,
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          context,
          icon: Icons.health_and_safety_outlined,
          iconColor: ZoopColors.accentPurple,
          title: 'Diagnostics',
          subtitle: 'Check network health and NAT traversal',
          onTap: () => context.push('/diagnostics'),
        ),
      ],
    );
  }

  Widget _buildActionTile(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14.0),
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
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
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
                      fontSize: 11.5,
                      color: ZoopColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              size: 18,
              color: ZoopColors.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // ZOOP POINTS CARD (Wallet Presentation)
  // ===========================================================================
  Widget _buildZoopPointsCard(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/wallet'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              Color(0xFF131C2D),
              Color(0xFF0E131E),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: ZoopColors.primaryCyan.withValues(alpha: 0.22),
            width: 1.1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Label + Recent Points Gain
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        size: 13,
                        color: ZoopColors.primaryCyan,
                      ),
                    ),
                    const SizedBox(width: 7),
                    const Text(
                      'ZOOP POINTS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: ZoopColors.textSecondary,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.arrow_upward_rounded,
                        size: 11,
                        color: ZoopColors.accentGreen,
                      ),
                      SizedBox(width: 2),
                      Text(
                        '+45 ZP',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: ZoopColors.accentGreen,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Middle Row: Big Points Display
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                const Text(
                  '1,250',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: ZoopColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'ZP',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: ZoopColors.primaryCyan,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const Spacer(),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 13,
                  color: ZoopColors.textMuted,
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Bottom Micro-Info
            const Text(
              'Min. 100 ZP required to participate',
              style: TextStyle(
                fontSize: 10.5,
                color: ZoopColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
