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
import '../widgets/gateway_selector_sheet.dart';
import '../widgets/provider_selection_sheet.dart';
import '../../../diagnostics/domain/diagnostic_models.dart';
import '../../../diagnostics/application/diagnostics_notifier.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen>
    with SingleTickerProviderStateMixin {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  RoutingMode _routingMode = RoutingMode.fullInternet;
  String _connectingStep = 'Initializing...';
  late AnimationController _animController;
  StreamSubscription? _vpnEventSubscription;

  // Quick-reconnect peer chips state
  final List<String> _recentPeers = ['Frankfurt #1', 'Amsterdam #2', 'Dubai #3'];
  int _selectedRecentPeerIndex = 0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkInitialVpnStatus();
      _listenToVpnEvents();
    });
  }

  @override
  void dispose() {
    _vpnEventSubscription?.cancel();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _checkInitialVpnStatus() async {
    final vpnBridge = ref.read(vpnBridgeServiceProvider);
    final isRunning = await vpnBridge.isTunnelRunning();
    if (isRunning && mounted) {
      setState(() {
        _status = ConnectionStatus.connectedDirect;
      });
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
            _animController.stop();
          } else if (state == 'disconnected') {
            _status = ConnectionStatus.disconnected;
            _animController.stop();
          } else if (state == 'roaming') {
            _status = ConnectionStatus.roaming;
          }
        });
      } else if (type == 'error') {
        final message = event['message'] as String? ?? 'VPN Error occurred';
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
      final selectedPeer = peersState.selectedPeer;
      if (selectedPeer == null) {
        ProviderSelectionSheet.show(context);
        return;
      }

      setState(() {
        _status = ConnectionStatus.connecting;
        _connectingStep = 'Requesting VPN Permission...';
      });
      _animController.repeat();

      final prepared = await vpnBridge.prepareVpn();
      if (!prepared) {
        if (mounted) {
          setState(() {
            _status = ConnectionStatus.disconnected;
          });
          _animController.stop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('VPN permission was denied by the user'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        }
        return;
      }

      // Step 1: Resolve endpoints & keys
      if (mounted) {
        setState(() {
          _connectingStep = 'Resolving Provider ICE Candidates...';
        });
      }
      final resolved = await ref
          .read(peersNotifierProvider.notifier)
          .resolvePeerDetails(selectedPeer);
      final peerKey = resolved?.wireguardPublicKey ?? '';
      final candidatesJson = json.encode(resolved?.endpoints ?? []);
      const relayUrl = 'wss://3.70.135.200.sslip.io/v1/relay';

      // Step 2: Register connection session in Cloud Control Plane
      if (mounted) {
        setState(() {
          _connectingStep = 'Exchanging Cryptographic Session...';
        });
      }
      try {
        final endpointId = ref.read(identityNotifierProvider).endpointId;
        final storage = ref.read(secureStorageServiceProvider);
        final client = ref.read(cloudApiClientProvider);
        final seed = await storage.getEd25519SeedBytes();
        if (endpointId != null && seed != null) {
          await client.createConnection(
            endpointId: endpointId,
            targetDeviceId: selectedPeer.id.isNotEmpty
                ? selectedPeer.id
                : selectedPeer.endpointId,
            privateKeySeed: seed,
          );
        }
      } catch (_) {
        // Fallback gracefully if connection session exists or offline
      }

      // Step 3: Start tunnel with selected routing mode
      if (mounted) {
        setState(() {
          _connectingStep = 'Punching NAT & Initializing Tunnel...';
        });
      }
      await vpnBridge.startTunnel(
        peerKey: peerKey,
        candidatesJson: candidatesJson,
        relayUrl: relayUrl,
        routingMode: _routingMode.wireRouteParam,
      );

      if (mounted) {
        setState(() {
          _status = ConnectionStatus.connectedDirect;
          _animController.stop();
        });
      }
    } else {
      await vpnBridge.stopTunnel();
      if (mounted) {
        setState(() {
          _status = ConnectionStatus.disconnected;
          _animController.stop();
        });
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
        return ZoopColors.disconnected;
    }
  }

  void _showGatewaySelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => GatewaySelectorSheet(
        currentGatewayId: _recentPeers[_selectedRecentPeerIndex],
        isFullInternet: _routingMode == RoutingMode.fullInternet,
        onSelectGateway: (gw) {
          setState(() {
            if (!_recentPeers.contains(gw.name)) {
              _recentPeers.insert(0, gw.name);
              _selectedRecentPeerIndex = 0;
            } else {
              _selectedRecentPeerIndex = _recentPeers.indexOf(gw.name);
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Selected ${gw.name} (${gw.location})'),
              backgroundColor: ZoopColors.primaryCyan,
              duration: const Duration(seconds: 2),
            ),
          );
        },
        onToggleFullInternet: (full) {
          setState(() {
            _routingMode =
                full ? RoutingMode.fullInternet : RoutingMode.splitTunnel;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);
    final peersState = ref.watch(peersNotifierProvider);
    final selectedPeer = peersState.selectedPeer;

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        titleSpacing: 12,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 26,
              height: 26,
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
                      color: Colors.black, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
            const SizedBox(width: 7),
            const Text('ZOOP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(width: 8),
            // Inline cloud status pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
                    identityState.isRegistered ? 'CLOUD' : 'PENDING',
                    style: TextStyle(
                      fontSize: 8,
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
          // ZoopID Badge (if registered)
          if (identityState.zoopId != null)
            GestureDetector(
              onTap: () => context.push('/identity'),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: identityState.isRegistered
                            ? ZoopColors.accentGreen
                            : ZoopColors.accentAmber,
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
          // Wallet balance pill
          GestureDetector(
            onTap: () => context.go('/vault'),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 2),
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.35)),
              ),
              child: const Text(
                '\$12.50',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: ZoopColors.accentGreen,
                  letterSpacing: 0.2,
                ),
              ),
            ),
          ),
          // Settings
          IconButton(
            icon: const Icon(Icons.settings_outlined,
                color: ZoopColors.textSecondary, size: 20),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              // Quick-reconnect peer chips
              _buildRecentPeerChips(),

              const SizedBox(height: 20),

              // Recipient view (the main connect UI)
              _buildRecipientView(context, selectedPeer),

              const SizedBox(height: 24),

              _buildDiagnosticsCard(context),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // QUICK-RECONNECT PEER CHIPS
  // ==========================================
  Widget _buildRecentPeerChips() {
    return SizedBox(
      height: 36,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            ...List.generate(_recentPeers.length, (index) {
              final isSelected = _selectedRecentPeerIndex == index;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedRecentPeerIndex = index;
                  });
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? ZoopColors.primaryCyan.withValues(alpha: 0.12)
                        : ZoopColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isSelected
                          ? ZoopColors.primaryCyan
                          : ZoopColors.surfaceBorder,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.dns_rounded,
                        size: 12,
                        color: isSelected
                            ? ZoopColors.primaryCyan
                            : ZoopColors.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _recentPeers[index],
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? ZoopColors.primaryCyan
                              : ZoopColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            GestureDetector(
              onTap: _showGatewaySelector,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.tune, size: 12, color: ZoopColors.primaryCyan),
                    SizedBox(width: 5),
                    Text(
                      'All Gateways',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: ZoopColors.primaryCyan,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // RECIPIENT VIEW (MESH / CONNECT)
  // ==========================================
  Widget _buildRecipientView(BuildContext context, PeerDevice? selectedPeer) {
    return Column(
      children: [
        // Provider Node Selector & Routing Mode Row
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Target Provider Selector
            InkWell(
              onTap: _status.isConnected
                  ? null
                  : () => ProviderSelectionSheet.show(context),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: selectedPeer != null
                        ? ZoopColors.surfaceBorder
                        : ZoopColors.accentAmber.withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      selectedPeer != null
                          ? Icons.dns_rounded
                          : Icons.hub_outlined,
                      size: 16,
                      color: selectedPeer != null
                          ? ZoopColors.primaryCyan
                          : ZoopColors.accentAmber,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      selectedPeer != null
                          ? selectedPeer.name
                          : 'Select Provider',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: selectedPeer != null
                            ? ZoopColors.textPrimary
                            : ZoopColors.accentAmber,
                      ),
                    ),
                    if (!_status.isConnected) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_drop_down,
                          size: 16, color: ZoopColors.textMuted),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),

            // Routing Mode Selector
            InkWell(
              onTap: _status.isConnected ? null : _showGatewaySelector,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _routingMode.icon,
                      size: 16,
                      color: ZoopColors.accentGreen,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _routingMode == RoutingMode.fullInternet
                          ? 'Full Internet'
                          : 'Split Mesh',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    if (!_status.isConnected) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_drop_down,
                          size: 16, color: ZoopColors.textMuted),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 28),

        // Orbital Connection Node (Radar Orb)
        GestureDetector(
          onTap: _toggleConnection,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer Pulse Ring
              Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _statusColor.withValues(alpha: 0.25),
                    width: 2,
                  ),
                ),
              ),
              // Middle Ring
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _statusColor.withValues(alpha: 0.5),
                    width: 2,
                  ),
                ),
              ),
              // Core Node Button
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: ZoopColors.surface,
                  boxShadow: [
                    BoxShadow(
                      color: _statusColor.withValues(alpha: 0.3),
                      blurRadius: 24,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _status.isConnected
                          ? Icons.power_settings_new
                          : Icons.sensors,
                      size: 44,
                      color: _statusColor,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _status.isConnected ? 'DISCONNECT' : 'CONNECT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: _statusColor,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        if (_status.isConnected) ...[
          _buildSelfHealingBadge(context),
          const SizedBox(height: 16),
        ],

        // Status Text & Step Details
        Text(
          _status == ConnectionStatus.connecting
              ? 'Connecting...'
              : _status.label,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: _statusColor,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          _status == ConnectionStatus.connecting
              ? _connectingStep
              : (_status.isConnected
                  ? '100.64.0.2 • Routed via ${selectedPeer?.name ?? 'Frankfurt Node'}'
                  : (selectedPeer != null
                      ? 'Ready to route via ${selectedPeer.name} (${_routingMode.label})'
                      : 'Select a target provider above and tap connect')),
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 28),

        // Live Telemetry Card (Tappable for Tunnel Inspector)
        InkWell(
          onTap: _status.isConnected
              ? () => ConnectionDetailsSheet.show(
                    context,
                    peer: selectedPeer,
                    status: _status,
                    routingMode: _routingMode,
                  )
              : null,
          borderRadius: BorderRadius.circular(16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildTelemetryItem(
                        context,
                        icon: Icons.speed,
                        label: 'PING',
                        value: _status.isConnected ? '24 ms' : '--',
                        color: ZoopColors.accentGreen,
                      ),
                      _buildTelemetryItem(
                        context,
                        icon: Icons.arrow_downward,
                        label: 'DOWNLOAD',
                        value: _status.isConnected ? '42.8 Mbps' : '--',
                        color: ZoopColors.primaryCyan,
                      ),
                      _buildTelemetryItem(
                        context,
                        icon: Icons.arrow_upward,
                        label: 'UPLOAD',
                        value: _status.isConnected ? '18.4 Mbps' : '--',
                        color: ZoopColors.accentPurple,
                      ),
                    ],
                  ),
                  if (_status.isConnected) ...[
                    const Divider(height: 24, color: ZoopColors.surfaceBorder),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.info_outline,
                                size: 14, color: ZoopColors.primaryCyan),
                            const SizedBox(width: 6),
                            Text(
                              'Tap to Inspect Tunnel Details',
                              style: TextStyle(
                                fontSize: 12,
                                color: ZoopColors.primaryCyan
                                    .withValues(alpha: 0.9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'WireGuard Noise_IK',
                          style: Theme.of(context)
                              .textTheme
                              .labelSmall
                              ?.copyWith(
                                color: ZoopColors.textPrimary,
                              ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTelemetryItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(height: 4),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 2),
        Text(
          value,
          style:
              Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
        ),
      ],
    );
  }

  Widget _buildDiagnosticsCard(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/diagnostics'),
      borderRadius: BorderRadius.circular(16),
      child: Card(
        color: ZoopColors.surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: ZoopColors.surfaceBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.monitor_heart,
                    color: ZoopColors.primaryCyan),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Network Diagnostics',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Check network health, NAT type, and MTU',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: ZoopColors.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelfHealingBadge(BuildContext context) {
    final healingStatus = ref.watch(selfHealingStatusProvider);
    if (!healingStatus.active) return const SizedBox.shrink();

    Color color;
    String text;
    IconData icon;

    switch (healingStatus.peerState) {
      case DPDState.alive:
        color = ZoopColors.accentGreen;
        text = 'Peer Alive';
        icon = Icons.favorite;
        break;
      case DPDState.suspect:
        color = ZoopColors.accentAmber;
        text = 'Peer Suspect';
        icon = Icons.warning_amber_rounded;
        break;
      case DPDState.dead:
        color = ZoopColors.accentRose;
        text = 'Peer Dead - Failing Over...';
        icon = Icons.broken_image;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            text.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
