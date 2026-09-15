import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/di/core_providers.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/models/routing_mode.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/utils/zoop_feedback.dart';
import '../../../../core/widgets/zoop_badge.dart';
import '../../../../core/widgets/zoop_button.dart';
import '../../../../core/widgets/zoop_confirm_dialog.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../../core/widgets/zoop_offline_banner.dart';
import '../../../fleet/presentation/widgets/device_pairing_sheet.dart';
import '../../../identity/application/identity_notifier.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';
import '../../../sharing/application/sharing_notifier.dart';
import '../../../wallet/application/wallet_notifier.dart';
import '../../application/peers_notifier.dart';
import '../widgets/active_sharing_banner.dart';
import '../widgets/dashboard_quick_actions.dart';
import '../widgets/mesh_visualizer_card.dart';
import '../widgets/provider_selection_sheet.dart';
import '../widgets/zoop_points_card.dart';

/// Primary Dashboard screen featuring node status, central mesh visualizer,
/// quick tunnel controls, and ecosystem entry points.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen>
    with TickerProviderStateMixin {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  final RoutingMode _routingMode = RoutingMode.fullInternet;

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
          if (state == 'connected' || state == 'direct' || state == 'relayed' || state == 'recovered') {
            _status = isDirect
                ? ConnectionStatus.connectedDirect
                : ConnectionStatus.connectedRelay;
            _rotationController.stop();
            _pulseController.repeat(reverse: true);
          } else if (state == 'connecting') {
            _status = ConnectionStatus.connecting;
            _rotationController.repeat();
            _pulseController.stop();
          } else if (state == 'disconnected') {
            _status = ConnectionStatus.disconnected;
            _rotationController.stop();
            _pulseController.stop();
          } else if (state == 'roaming') {
            _status = ConnectionStatus.roaming;
          } else if (state == 'paused') {
            _status = ConnectionStatus.paused;
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

    if (!_status.isConnected && _status != ConnectionStatus.connecting) {
      final targetPeer = peersState.selectedPeer ??
          (peersState.peers.isNotEmpty ? peersState.peers.first : null);

      if (targetPeer == null) {
        ZoopFeedback.selection();
        ProviderSelectionSheet.show(context);
        return;
      }

      ZoopFeedback.medium();
      setState(() {
        _status = ConnectionStatus.connecting;
      });

      _rotationController.repeat();
      _pulseController.repeat(reverse: true);

      final prepared = await vpnBridge.prepareVpn();
      if (!prepared) {
        ZoopFeedback.heavy();
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

      // 2. Control plane session
      final conn = await ref
          .read(peersNotifierProvider.notifier)
          .initiatePeerConnection(targetPeer);

      final peerKey = (conn?['wireguard_public_key'] as String?)?.isNotEmpty == true
          ? conn!['wireguard_public_key'] as String
          : (resolved?.wireguardPublicKey ?? '');

      List<dynamic> candidatesList = [];
      if (conn?['candidates'] is List && (conn!['candidates'] as List).isNotEmpty) {
        candidatesList = conn['candidates'] as List;
      } else if (conn?['endpoint_ip'] != null && conn?['endpoint_port'] != null) {
        candidatesList = ['${conn!['endpoint_ip']}:${conn['endpoint_port']}'];
      } else if (resolved?.endpoints.isNotEmpty == true) {
        candidatesList = resolved!.endpoints;
      } else if (targetPeer.endpoints.isNotEmpty) {
        candidatesList = targetPeer.endpoints;
      }
      final candidatesJson = json.encode(candidatesList);

      final clientIp = (conn?['recipient_ip'] as String?)?.isNotEmpty == true
          ? conn!['recipient_ip'] as String
          : '100.64.0.2';

      // 3. Start tunnel
      try {
        final storage = ref.read(secureStorageServiceProvider);
        final privKey = await storage.getWireGuardPrivateKeyBase64();
        final rawCloudUrl = await storage.getCloudUrl();
        final relayUrl = rawCloudUrl.startsWith('https://')
            ? '${rawCloudUrl.replaceFirst('https://', 'wss://')}/v1/relay'
            : '${rawCloudUrl.replaceFirst('http://', 'ws://')}/v1/relay';

        await vpnBridge.startTunnel(
          peerKey: peerKey,
          privateKey: privKey,
          candidatesJson: candidatesJson,
          relayUrl: relayUrl,
          routingMode: _routingMode.wireRouteParam,
          clientIp: clientIp,
        );

        // Tunnel service launched. The native VpnService event stream will
        // transition the status to connectedDirect or connectedRelay as soon as
        // the WireGuard handshake or relay connection is confirmed.
      } catch (e) {
        if (mounted) {
          ZoopFeedback.heavy();
          setState(() {
            _status = ConnectionStatus.error;
          });
          _rotationController.stop();
          _pulseController.stop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Connection failed: $e'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        }
      }
    } else {
      if (_status.isConnected) {
        final activePeer = peersState.selectedPeer ??
            (peersState.peers.isNotEmpty ? peersState.peers.first : null);
        final confirm = await ZoopConfirmDialog.show(
          context: context,
          title: 'Disconnect VPN Tunnel?',
          message: 'Your active encrypted tunnel session${activePeer != null ? ' to "${activePeer.name}"' : ''} will be terminated.',
          confirmLabel: 'Disconnect',
          cancelLabel: 'Keep Connected',
          isDestructive: true,
          icon: Icons.link_off_rounded,
        );
        if (!confirm) return;
      }

      try {
        await vpnBridge.stopTunnel();
      } catch (e) {
        debugPrint('Error stopping tunnel: $e');
      } finally {
        if (mounted) {
          setState(() {
            _status = ConnectionStatus.disconnected;
          });
          _rotationController.stop();
          _pulseController.stop();
        }
      }
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

  @override
  Widget build(BuildContext context) {
    final isRegistered =
        ref.watch(identityNotifierProvider.select((i) => i.isRegistered));
    final cloudStatus =
        ref.watch(identityNotifierProvider.select((i) => i.cloudStatus));
    final zoopId =
        ref.watch(identityNotifierProvider.select((i) => i.zoopId));
    final isSharingActive =
        ref.watch(sharingProvider.select((s) => s.isSharingActive));
    final activePeer = ref.watch(peersNotifierProvider.select((p) =>
        p.selectedPeer ?? (p.peers.isNotEmpty ? p.peers.first : null)));

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
            ZoopSpacing.gapSm,
            const Text(
              'ZOOP',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 17,
                letterSpacing: 0.5,
              ),
            ),
            isRegistered
                ? const ZoopBadge.online()
                : const ZoopBadge.syncing(),
          ],
        ),
        actions: [
          if (zoopId != null)
            Semantics(
              button: true,
              label: 'Device Identity: $zoopId',
              child: GestureDetector(
                onTap: () => context.push('/identity'),
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceElevated,
                    borderRadius: ZoopSpacing.radiusSm,
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
                        zoopId,
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
            ),
          IconButton(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.notifications_outlined,
                  color: ZoopColors.textSecondary,
                  size: 22,
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
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
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
              size: 22,
            ),
            constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
          ZoopSpacing.gapSm,
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: ZoopColors.primaryCyan,
          backgroundColor: ZoopColors.surface,
          onRefresh: () async {
            await Future.wait([
              ref.read(peersNotifierProvider.notifier).loadPeers(),
              ref.read(walletProvider.notifier).refreshAll(),
              ref.read(identityNotifierProvider.notifier).verifyCloudConnection(),
            ]);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!isRegistered || cloudStatus == 'offline') ...[
                  ZoopOfflineBanner(
                    onReconnect: () => ref.read(identityNotifierProvider.notifier).verifyCloudConnection(),
                  ),
                ],
                if (_status == ConnectionStatus.error) ...[
                  ZoopErrorBanner(
                    title: 'Tunnel Connection Error',
                    message: 'WireGuard tunnel session failed to establish or timed out. Check peer reachability and retry.',
                    onRetry: _toggleConnection,
                  ),
                ],

                // Active Sharing Banner if enabled
                if (isSharingActive) ...[
                  const ActiveSharingBanner(),
                  const SizedBox(height: 14),
                ],

                // Zoop Points Required to Participate Card
                const ZoopPointsCard(),

                ZoopSpacing.gapLg,

                // Central Device-to-Device Mesh Visualizer Card
                MeshVisualizerCard(
                  status: _status,
                  activePeer: activePeer,
                  isConnected: isConnected,
                  isConnecting: isConnecting,
                  rotationController: _rotationController,
                  pulseAnimation: pulseAnimation,
                  onSelectPeer: () {
                    ZoopFeedback.selection();
                    ProviderSelectionSheet.show(context);
                  },
                ),

                ZoopSpacing.gapLg,

                // Separate Dedicated Connect Button
                _buildConnectActionButton(
                  isConnected,
                  isConnecting,
                  targetPeerName: activePeer?.name,
                ),

                ZoopSpacing.gapXxl,

                // Ecosystem Quick Actions
                DashboardQuickActions(
                  onShareBandwidth: () => context.go('/sharing'),
                  onPairDevice: _showPairDeviceModal,
                  onDiagnostics: () => context.push('/diagnostics'),
                ),

                const SizedBox(height: 60),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildConnectActionButton(
    bool isConnected,
    bool isConnecting, {
    String? targetPeerName,
  }) {
    if (isConnected) {
      return ZoopButton.destructive(
        label: 'Disconnect',
        icon: Icons.power_settings_new,
        onPressed: _toggleConnection,
        isFullWidth: true,
        height: 52,
        semanticsLabel: 'Disconnect VPN tunnel',
      );
    }

    if (isConnecting) {
      return ZoopButton.destructive(
        label: 'Cancel Connecting',
        icon: Icons.close_rounded,
        onPressed: _toggleConnection,
        isFullWidth: true,
        height: 52,
        semanticsLabel: 'Cancel connection attempt to ${targetPeerName ?? "peer"}',
      );
    }

    return ZoopButton.primary(
      label: 'Connect',
      icon: Icons.bolt_rounded,
      onPressed: _toggleConnection,
      isFullWidth: true,
      height: 52,
      semanticsLabel: 'Connect VPN tunnel to ${targetPeerName ?? "peer"}',
    );
  }
}
