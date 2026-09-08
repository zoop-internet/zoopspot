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
import '../../../provider/application/provider_notifier.dart';
import '../../../provider/domain/provider_settings.dart';
import '../../../provider/presentation/widgets/gateway_settings_sheet.dart';
import '../../application/peers_notifier.dart';
import '../widgets/connection_details_sheet.dart';
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
  bool _isProviderMode = false;
  RoutingMode _routingMode = RoutingMode.fullInternet;
  String _connectingStep = 'Initializing...';
  late AnimationController _animController;
  StreamSubscription? _vpnEventSubscription;

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

  @override
  Widget build(BuildContext context) {
    final identityState = ref.watch(identityNotifierProvider);
    final peersState = ref.watch(peersNotifierProvider);
    final selectedPeer = peersState.selectedPeer;
    final providerSettings = ref.watch(providerNotifierProvider);
    final providerNotifier = ref.read(providerNotifierProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Row(
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
                      color: Colors.black, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text('ZOOP'),
          ],
        ),
        actions: [
          // ZoopID Badge Button
          if (identityState.zoopId != null)
            GestureDetector(
              onTap: () => context.push('/identity'),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: identityState.isRegistered
                            ? ZoopColors.accentGreen
                            : ZoopColors.accentAmber,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      identityState.zoopId!,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: ZoopColors.primaryCyan,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          IconButton(
            icon: Icon(
              Icons.sync_alt,
              color: _isProviderMode
                  ? ZoopColors.accentPurple
                  : ZoopColors.textSecondary,
            ),
            tooltip: 'Toggle Provider / Recipient Mode',
            onPressed: () {
              setState(() => _isProviderMode = !_isProviderMode);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isProviderMode
                      ? 'Switched to Provider Console (Sharing)'
                      : 'Switched to Recipient Mode (Connecting)'),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.fingerprint, color: ZoopColors.textSecondary),
            tooltip: 'Device Identity',
            onPressed: () => context.push('/identity'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              // Cloud Status Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.cloud_done,
                          size: 16,
                          color: identityState.isRegistered
                              ? ZoopColors.accentGreen
                              : ZoopColors.accentAmber,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          identityState.isRegistered
                              ? 'Cloud Control: Frankfurt (3.70.135.200)'
                              : 'Cloud Registration Pending',
                          style: const TextStyle(
                              fontSize: 12, color: ZoopColors.textSecondary),
                        ),
                      ],
                    ),
                    Text(
                      (identityState.cloudStatus ?? 'trusted').toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: identityState.isRegistered
                            ? ZoopColors.accentGreen
                            : ZoopColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Mode Indicator Switcher Chip
              GestureDetector(
                onTap: () {
                  setState(() => _isProviderMode = !_isProviderMode);
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: ZoopColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _isProviderMode
                          ? ZoopColors.accentPurple
                          : ZoopColors.primaryCyan,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isProviderMode ? Icons.upload : Icons.download,
                        size: 16,
                        color: _isProviderMode
                            ? ZoopColors.accentPurple
                            : ZoopColors.primaryCyan,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isProviderMode
                            ? 'PROVIDER MODE (GATEWAY SHARING)'
                            : 'RECIPIENT MODE (CONNECTING)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _isProviderMode
                              ? ZoopColors.accentPurple
                              : ZoopColors.primaryCyan,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.swap_horiz,
                          size: 14, color: ZoopColors.textMuted),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Render Recipient vs Provider UI
              if (!_isProviderMode)
                _buildRecipientView(context, selectedPeer)
              else
                _buildProviderView(
                    context, providerSettings, providerNotifier),

              const SizedBox(height: 24),
              _buildDiagnosticsCard(context),
            ],
          ),
        ),
      ),
    );
  }

  // ==========================================
  // RECIPIENT MODE (PHASE 6)
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
              onTap: _status.isConnected ? null : _toggleRoutingMode,
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

        // Orbital Connection Node
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

  void _toggleRoutingMode() {
    setState(() {
      _routingMode = _routingMode == RoutingMode.fullInternet
          ? RoutingMode.splitTunnel
          : RoutingMode.fullInternet;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Routing Mode: ${_routingMode.label}'),
        duration: const Duration(milliseconds: 1200),
      ),
    );
  }

  // ==========================================
  // PROVIDER MODE (PHASE 7)
  // ==========================================
  Widget _buildProviderView(
    BuildContext context,
    ProviderSettings settings,
    ProviderNotifier notifier,
  ) {
    final isActive = settings.isGatewayActive;
    final themeColor =
        isActive ? ZoopColors.accentPurple : ZoopColors.disconnected;

    return Column(
      children: [
        // Provider Policy & Scope Chip
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.security,
                      size: 14, color: ZoopColors.accentPurple),
                  const SizedBox(width: 6),
                  Text(
                    'Scope: ${settings.sharingScope.label}',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: ZoopColors.textPrimary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: () => GatewaySettingsSheet.show(context),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: ZoopColors.accentPurple.withValues(alpha: 0.5)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.tune, size: 14, color: ZoopColors.accentPurple),
                    SizedBox(width: 6),
                    Text(
                      'Policies',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: ZoopColors.accentPurple),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 28),

        // Orbital Provider Power Switch
        GestureDetector(
          onTap: () {
            notifier.toggleGateway(!isActive);
          },
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: themeColor.withValues(alpha: 0.25),
                    width: 2,
                  ),
                ),
              ),
              Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: themeColor.withValues(alpha: 0.5),
                    width: 2,
                  ),
                ),
              ),
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: ZoopColors.surface,
                  boxShadow: [
                    BoxShadow(
                      color: themeColor.withValues(alpha: 0.3),
                      blurRadius: 24,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      isActive ? Icons.power_settings_new : Icons.sensors,
                      size: 44,
                      color: themeColor,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isActive ? 'STOP SHARING' : 'START SHARING',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: themeColor,
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

        // Provider Status Headline
        Text(
          isActive ? 'Gateway Active (Sharing)' : 'Gateway Standby',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: themeColor,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          isActive
              ? '${settings.activeSessions.length} active client${settings.activeSessions.length == 1 ? '' : 's'} • ${settings.formattedTotalShared} routed'
              : 'Tap button to start sharing egress access with your devices',
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 28),

        // Shared Egress Telemetry Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildTelemetryItem(
                  context,
                  icon: Icons.devices,
                  label: 'CLIENTS',
                  value: isActive ? '${settings.activeSessions.length}' : '0',
                  color: ZoopColors.accentPurple,
                ),
                _buildTelemetryItem(
                  context,
                  icon: Icons.speed,
                  label: 'EGRESS RATE',
                  value: isActive ? '3.4 Mbps' : '--',
                  color: ZoopColors.primaryCyan,
                ),
                _buildTelemetryItem(
                  context,
                  icon: Icons.cloud_upload_outlined,
                  label: 'TOTAL ROUTED',
                  value: isActive ? settings.formattedTotalShared : '--',
                  color: ZoopColors.accentGreen,
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),

        // Connected Recipients List Card
        if (isActive && settings.activeSessions.isNotEmpty) ...[
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'CONNECTED CLIENTS (${settings.activeSessions.length})',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    letterSpacing: 1.2,
                    color: ZoopColors.accentPurple,
                  ),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: settings.activeSessions.length,
              separatorBuilder: (context, index) =>
                  const Divider(height: 1, color: ZoopColors.surfaceBorder),
              itemBuilder: (context, index) {
                final session = settings.activeSessions[index];
                return ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: ZoopColors.surface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      session.platform == 'macos'
                          ? Icons.laptop_mac
                          : Icons.phone_android,
                      size: 20,
                      color: ZoopColors.accentPurple,
                    ),
                  ),
                  title: Text(
                    session.clientName,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    '${session.clientVirtualIp} • Shared ${session.formattedUploaded}',
                    style: const TextStyle(
                        fontSize: 12, color: ZoopColors.textSecondary),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.close,
                        size: 18, color: ZoopColors.accentRose),
                    tooltip: 'Disconnect Client',
                    onPressed: () {
                      notifier.disconnectRecipient(session.clientId);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Disconnected ${session.clientName}'),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],

        const SizedBox(height: 16),

        // Safeguards Summary Pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: ZoopColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: ZoopColors.surfaceBorder),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.shield,
                      size: 16, color: ZoopColors.accentGreen),
                  const SizedBox(width: 8),
                  Text(
                    settings.pauseOnCellular
                        ? 'Wi-Fi Enforced • Battery Protected (< 20%)'
                        : 'Cellular Allowed • Battery Protected (< 20%)',
                    style: const TextStyle(
                        fontSize: 11, color: ZoopColors.textSecondary),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => GatewaySettingsSheet.show(context),
                child: const Text(
                  'Edit',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: ZoopColors.accentPurple,
                  ),
                ),
              ),
            ],
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
                child: const Icon(Icons.monitor_heart, color: ZoopColors.primaryCyan),
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
