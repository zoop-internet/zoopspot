import 'package:flutter/material.dart';
import '../../../../core/models/connection_state.dart';
import '../../../../core/theme/zoop_colors.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  ConnectionStatus _status = ConnectionStatus.disconnected;
  bool _isProviderMode = false;
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _toggleConnection() {
    setState(() {
      if (_status == ConnectionStatus.disconnected) {
        _status = ConnectionStatus.connecting;
        _animController.repeat();
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            setState(() {
              _status = ConnectionStatus.connectedDirect;
              _animController.stop();
            });
          }
        });
      } else {
        _status = ConnectionStatus.disconnected;
        _animController.stop();
      }
    });
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
          IconButton(
            icon: const Icon(Icons.sync_alt, color: ZoopColors.textSecondary),
            onPressed: () {
              setState(() => _isProviderMode = !_isProviderMode);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isProviderMode ? 'Switched to Provider Mode (Sharing)' : 'Switched to Recipient Mode (Connecting)'),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: ZoopColors.textSecondary),
            onPressed: () {},
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
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

              const SizedBox(height: 36),

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

              const SizedBox(height: 28),

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

              const SizedBox(height: 36),

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
