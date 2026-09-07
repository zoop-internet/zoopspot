import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/vpn/vpn_bridge_service.dart';
import '../../../identity/application/identity_notifier.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> with SingleTickerProviderStateMixin {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  bool _isProviderMode = false;
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
            _status = isDirect ? ConnectionStatus.connectedDirect : ConnectionStatus.connectedRelay;
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

    if (_status == ConnectionStatus.disconnected) {
      setState(() {
        _status = ConnectionStatus.connecting;
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

      await vpnBridge.startTunnel();
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
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
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
                  border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: identityState.isRegistered ? ZoopColors.accentGreen : ZoopColors.accentAmber,
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
            icon: const Icon(Icons.sync_alt, color: ZoopColors.textSecondary),
            tooltip: 'Toggle Provider / Recipient Mode',
            onPressed: () {
              setState(() => _isProviderMode = !_isProviderMode);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isProviderMode
                      ? 'Switched to Provider Mode (Sharing)'
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
                          color: identityState.isRegistered ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          identityState.isRegistered
                              ? 'Cloud Control: Frankfurt (3.70.135.200)'
                              : 'Cloud Registration Pending',
                          style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                        ),
                      ],
                    ),
                    Text(
                      (identityState.cloudStatus ?? 'trusted').toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: identityState.isRegistered ? ZoopColors.accentGreen : ZoopColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Mode Indicator Chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: ZoopColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isProviderMode ? ZoopColors.accentPurple : ZoopColors.primaryCyan,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isProviderMode ? Icons.upload : Icons.download,
                      size: 14,
                      color: _isProviderMode ? ZoopColors.accentPurple : ZoopColors.primaryCyan,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _isProviderMode ? 'PROVIDER MODE (SHARING)' : 'RECIPIENT MODE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _isProviderMode ? ZoopColors.accentPurple : ZoopColors.primaryCyan,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

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
                            _status.isConnected ? Icons.power_settings_new : Icons.sensors,
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

              // Status Text
              Text(
                _status.label,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: _statusColor,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _status.isConnected
                    ? '100.64.0.2 • Peer: Frankfurt-Node-1'
                    : 'Tap the node to establish encrypted tunnel',
                style: Theme.of(context).textTheme.bodyMedium,
              ),

              const SizedBox(height: 32),

              // Live Telemetry Card
              Card(
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
                            Text('Tunnel Protocol', style: Theme.of(context).textTheme.bodyMedium),
                            Text(
                              'WireGuard Noise_IK (UDP)',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
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
            ],
          ),
        ),
      ),
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
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
        ),
      ],
    );
  }
}
