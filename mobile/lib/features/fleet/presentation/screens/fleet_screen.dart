import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../devices/application/devices_notifier.dart';
import '../../../devices/domain/fleet_device_model.dart';
import '../../../devices/presentation/widgets/device_details_sheet.dart';
import '../../../organizations/application/organizations_notifier.dart';
import '../../../organizations/domain/organization_models.dart';
import '../../../organizations/presentation/widgets/organization_details_sheet.dart';
import '../widgets/device_pairing_sheet.dart';

class FleetScreen extends ConsumerStatefulWidget {
  const FleetScreen({super.key});

  @override
  ConsumerState<FleetScreen> createState() => _FleetScreenState();
}

class _FleetScreenState extends ConsumerState<FleetScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _joinCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _joinCodeController.dispose();
    super.dispose();
  }

  void _showPairingSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const DevicePairingSheet(
        deviceName: 'Zoop Primary Phone',
        deviceId: 'ZP-85E550',
      ),
    );
  }

  void _showDeviceSheet(BuildContext context, FleetDeviceItem device) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DeviceDetailsSheet(
        device: device,
        onRename: (newName) {
          ref.read(devicesProvider.notifier).renameDevice(device.id, newName);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Device renamed to "$newName"'),
              backgroundColor: ZoopColors.accentGreen,
            ),
          );
        },
        onRevoke: () {
          ref.read(devicesProvider.notifier).revokeDevice(device.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${device.name} removed from fleet'),
              backgroundColor: ZoopColors.accentRose,
            ),
          );
        },
      ),
    );
  }

  void _showOrgDetails(BuildContext context, OrganizationItem org) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => OrganizationDetailsSheet(
        org: org,
        onLeave: () {
          ref.read(organizationsProvider.notifier).leaveOrganization(org.id);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Left ${org.name}'),
              backgroundColor: ZoopColors.surfaceElevated,
            ),
          );
        },
      ),
    );
  }

  void _handleJoinOrgWithCode() {
    final code = _joinCodeController.text.trim();
    if (code.isEmpty) return;
    _joinCodeController.clear();
    FocusScope.of(context).unfocus();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Joining organization with code "$code"...'),
        backgroundColor: ZoopColors.primaryCyan,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final devicesState = ref.watch(devicesProvider);
    final orgsState = ref.watch(organizationsProvider);

    return Scaffold(
      backgroundColor: ZoopColors.background,
      appBar: AppBar(
        backgroundColor: ZoopColors.background,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.device_hub, color: ZoopColors.primaryCyan, size: 22),
            SizedBox(width: 8),
            Text(
              'Fleet',
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
            label: 'Pair new device to fleet',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.add_circle_outline_rounded, color: ZoopColors.primaryCyan),
              tooltip: 'Pair Device',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () => _showPairingSheet(context),
            ),
          ),
          Semantics(
            label: 'Refresh fleet nodes and gateways',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.refresh, color: ZoopColors.textSecondary),
              tooltip: 'Refresh',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () {
                ref.read(devicesProvider.notifier).refreshDevices();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Refreshed fleet nodes and gateways'),
                    duration: Duration(milliseconds: 1000),
                  ),
                );
              },
            ),
          ),
          Semantics(
            label: 'Open network settings',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
              tooltip: 'Settings',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              onPressed: () => context.push('/settings'),
            ),
          ),
          const SizedBox(width: 6),
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
              dividerColor: Colors.transparent,
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
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
              tabs: [
                Tab(
                  child: Semantics(
                    label: 'My Nodes tab, ${devicesState.devices.length} devices enrolled',
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('My Nodes'),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${devicesState.devices.length}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: ZoopColors.primaryCyan,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Tab(
                  child: Semantics(
                    label: 'Gateways and Exits tab, ${devicesState.gateways.length} gateways configured',
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Gateways & Exits'),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: devicesState.activeExitNodeId != null
                                ? ZoopColors.accentGreen.withValues(alpha: 0.2)
                                : ZoopColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${devicesState.gateways.length}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: devicesState.activeExitNodeId != null
                                  ? ZoopColors.accentGreen
                                  : ZoopColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Tab(
                  child: Semantics(
                    label: 'Organizations tab, ${orgsState.organizations.length} organizations joined',
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Organizations'),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: ZoopColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${orgsState.organizations.length}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: ZoopColors.textSecondary,
                            ),
                          ),
                        ),
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
          // Tab 0: My Nodes
          _buildDevicesTab(context, devicesState),
          // Tab 1: Gateways & Exits
          _buildGatewaysTab(context, devicesState),
          // Tab 2: Organizations
          _buildOrganizationsTab(context, orgsState),
        ],
      ),
    );
  }

  Widget _buildDevicesTab(BuildContext context, DevicesState state) {
    final onlineDevices = state.onlineDevices;
    final offlineDevices = state.offlineDevices;
    final activeExit = state.activeExitNode;

    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: () async {
        ref.read(devicesProvider.notifier).refreshDevices();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (state.errorMessage != null)
              ZoopErrorBanner(
                title: 'Fleet Synchronization Error',
                message: state.errorMessage!,
                onRetry: () => ref.read(devicesProvider.notifier).refreshDevices(),
              ),

            // Mesh Fabric Overview Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.hub_outlined, color: ZoopColors.primaryCyan, size: 24),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'WireGuard Mesh',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '10.88.0.0/24 • ${onlineDevices.length}/${state.devices.length} online',
                              style: const TextStyle(fontSize: 11, color: ZoopColors.accentGreen, fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Semantics(
                        label: 'Pair new device to WireGuard mesh',
                        button: true,
                        child: OutlinedButton.icon(
                          onPressed: () => _showPairingSheet(context),
                          icon: const Icon(Icons.qr_code, size: 16),
                          label: const Text('Pair'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(80, 44),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            side: const BorderSide(color: ZoopColors.primaryCyan),
                            foregroundColor: ZoopColors.primaryCyan,
                            textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (activeExit != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentGreen.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: ZoopColors.accentGreen.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shield_rounded, color: ZoopColors.accentGreen, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Routing via ${activeExit.name} (${activeExit.ipAddress})',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ZoopColors.accentGreen),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Semantics(
                            label: 'Disconnect exit route via ${activeExit.name}',
                            button: true,
                            child: InkWell(
                              onTap: () {
                                ref.read(devicesProvider.notifier).toggleExitNode(activeExit.id);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Exit node routing disconnected'),
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                child: Text(
                                  'Disconnect',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: ZoopColors.accentRose,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Online Nodes Section
            if (onlineDevices.isNotEmpty) ...[
              _buildSectionHeader('ACTIVE MESH NODES (${onlineDevices.length})', ZoopColors.accentGreen),
              const SizedBox(height: 8),
              ...onlineDevices.map((dev) => _buildDeviceCard(context, dev)),
              const SizedBox(height: 16),
            ],

            // Offline Nodes Section
            if (offlineDevices.isNotEmpty) ...[
              _buildSectionHeader('OFFLINE / STANDBY (${offlineDevices.length})', ZoopColors.textMuted),
              const SizedBox(height: 8),
              ...offlineDevices.map((dev) => _buildDeviceCard(context, dev)),
            ],

            if (state.isLoading && state.devices.isEmpty) ...[
              const ZoopSkeletonCard(height: 90, padding: EdgeInsets.all(14)),
              const SizedBox(height: 10),
              const ZoopSkeletonCard(height: 90, padding: EdgeInsets.all(14)),
            ] else if (state.devices.isEmpty)
              ZoopEmptyState(
                icon: Icons.devices_other_rounded,
                title: 'No Enrolled Devices',
                description: 'Pair your phone, laptop, or home edge router using secure QR or terminal exchange.',
                primaryActionLabel: 'Pair First Device',
                primaryActionIcon: Icons.qr_code_scanner,
                onPrimaryAction: () => _showPairingSheet(context),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGatewaysTab(BuildContext context, DevicesState state) {
    final notifier = ref.read(devicesProvider.notifier);
    final gateways = state.gateways;
    final activeExit = state.activeExitNode;

    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: () async {
        notifier.refreshDevices();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Exit Node Routing Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: activeExit != null
                    ? ZoopColors.accentGreen.withValues(alpha: 0.1)
                    : ZoopColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: activeExit != null
                      ? ZoopColors.accentGreen.withValues(alpha: 0.4)
                      : ZoopColors.surfaceBorder,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: activeExit != null
                          ? ZoopColors.accentGreen.withValues(alpha: 0.2)
                          : ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      activeExit != null ? Icons.vpn_lock_rounded : Icons.alt_route_rounded,
                      color: activeExit != null ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activeExit != null
                              ? 'Traffic Routed via ${activeExit.name}'
                              : 'Direct Egress (No Exit Node Active)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: activeExit != null
                                ? ZoopColors.accentGreen
                                : ZoopColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          activeExit != null
                              ? 'All internet traffic is securely tunneled through ${activeExit.ipAddress}. Your public IP appears as the gateway.'
                              : 'Traffic routes directly over local network interfaces. Select a gateway below to tunnel all outbound requests.',
                          style: const TextStyle(fontSize: 12, color: ZoopColors.textSecondary, height: 1.3),
                        ),
                        if (activeExit != null) ...[
                          const SizedBox(height: 10),
                          Semantics(
                            label: 'Disconnect exit route',
                            button: true,
                            child: OutlinedButton.icon(
                              onPressed: () => notifier.toggleExitNode(activeExit.id),
                              icon: const Icon(Icons.power_settings_new, size: 16),
                              label: const Text('Disconnect Exit Route'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: ZoopColors.accentRose,
                                side: const BorderSide(color: ZoopColors.accentRose),
                                minimumSize: const Size(160, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildSectionHeader('CONFIGURED GATEWAYS & EXITS (${gateways.length})', ZoopColors.primaryCyan),
            const SizedBox(height: 8),

            if (gateways.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.router_outlined, size: 48, color: ZoopColors.textMuted),
                    SizedBox(height: 12),
                    Text(
                      'No Exit Gateways Configured',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Pair a Linux server or router node to enable full-tunnel internet routing and subnet peering.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                    ),
                  ],
                ),
              )
            else
              ...gateways.map((gw) {
                final isActive = state.activeExitNodeId == gw.id;
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isActive
                          ? ZoopColors.accentGreen
                          : ZoopColors.surfaceBorder,
                      width: isActive ? 1.5 : 1.0,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? ZoopColors.accentGreen.withValues(alpha: 0.15)
                                  : ZoopColors.primaryCyan.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              Icons.dns_rounded,
                              color: isActive ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        gw.name,
                                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                                      ),
                                    ),
                                    if (isActive)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: ZoopColors.accentGreen.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text(
                                          'ACTIVE ✓',
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: ZoopColors.accentGreen),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${gw.ipAddress} • ${gw.platform}',
                                  style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: ZoopColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.share_location, size: 14, color: ZoopColors.accentPurple),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Route: ${gw.subnetRoute ?? "0.0.0.0/0 (Default Gateway)"}',
                                style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: ZoopColors.textSecondary),
                              ),
                            ),
                            if (gw.pingMs != null) ...[
                              Text('⚡ ${gw.pingMs} ms', style: const TextStyle(fontSize: 11, color: ZoopColors.accentGreen, fontWeight: FontWeight.w600)),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Semantics(
                            label: 'View details for gateway node ${gw.name}',
                            button: true,
                            child: OutlinedButton(
                              onPressed: () => _showDeviceSheet(context, gw),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: ZoopColors.textSecondary,
                                side: const BorderSide(color: ZoopColors.surfaceBorder),
                                minimumSize: const Size(96, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              child: const Text('Node Details'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Semantics(
                            label: isActive ? 'Exit route is currently active through ${gw.name}. Tap to disconnect' : 'Set ${gw.name} as active exit route',
                            button: true,
                            child: ElevatedButton.icon(
                              onPressed: () => notifier.toggleExitNode(gw.id),
                              icon: Icon(isActive ? Icons.check : Icons.vpn_lock, size: 16),
                              label: Text(isActive ? 'Active Exit Node' : 'Use as Exit Node'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isActive ? ZoopColors.accentGreen : ZoopColors.primaryCyan,
                                foregroundColor: Colors.black,
                                minimumSize: const Size(140, 44),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

            const SizedBox(height: 16),

            // Deploy New Gateway CTA
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: ZoopColors.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.terminal, color: ZoopColors.accentPurple, size: 22),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Deploy a Linux / Docker Gateway',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'One-liner CLI enrollment for cloud VPS or home router.',
                          style: TextStyle(fontSize: 11, color: ZoopColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    label: 'Deploy Linux or Docker gateway node',
                    button: true,
                    child: IconButton(
                      onPressed: () => _showPairingSheet(context),
                      icon: const Icon(Icons.chevron_right, color: ZoopColors.primaryCyan),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      tooltip: 'Deploy Gateway',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceCard(BuildContext context, FleetDeviceItem dev) {
    final statusText = dev.isOnline ? 'online' : 'standby';
    final identityText = dev.isCurrentDevice ? ', this device' : '';
    final exitText = dev.isExitNode ? ', exit gateway' : '';
    final semanticsLabel = '${dev.name}$identityText, $statusText$exitText, IP ${dev.ipAddress}, platform ${dev.platform}, role ${dev.role.label}. Tap to open node details.';

    return Semantics(
      label: semanticsLabel,
      button: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: ZoopColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ZoopColors.surfaceBorder),
        ),
        child: ListTile(
          onTap: () => _showDeviceSheet(context, dev),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: dev.isOnline
                      ? ZoopColors.primaryCyan.withValues(alpha: 0.15)
                      : ZoopColors.surfaceElevated,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  dev.platformIcon,
                  color: dev.isOnline ? ZoopColors.primaryCyan : ZoopColors.textMuted,
                  size: 20,
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: dev.isOnline ? ZoopColors.accentGreen : ZoopColors.surfaceBorder,
                    border: Border.all(color: ZoopColors.surface, width: 1.5),
                  ),
                  child: Center(
                    child: Icon(
                      dev.isOnline ? Icons.check : Icons.remove,
                      size: 8,
                      color: dev.isOnline ? Colors.black : ZoopColors.textMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
          title: Row(
            children: [
              Flexible(
                child: Text(
                  dev.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (dev.isCurrentDevice) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentGreen.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'THIS DEVICE',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: ZoopColors.accentGreen),
                  ),
                ),
              ],
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 3),
              Text(
                '${dev.ipAddress} • ${dev.platform} • ${dev.role.label}',
                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (dev.pingMs != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('⚡ ', style: TextStyle(fontSize: 10)),
                          Text(
                            '${dev.pingMs} ms',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: (dev.pingMs! < 25) ? ZoopColors.accentGreen : ZoopColors.accentAmber,
                            ),
                          ),
                        ],
                      ),
                    ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      dev.connectionType,
                      style: const TextStyle(fontSize: 10, color: ZoopColors.primaryCyan, fontWeight: FontWeight.w500),
                    ),
                  ),
                  if (dev.isExitNode)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Exit Gateway',
                        style: TextStyle(fontSize: 10, color: ZoopColors.accentPurple, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
            ],
          ),
          trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
        ),
      ),
    );
  }

  Widget _buildOrganizationsTab(BuildContext context, OrganizationsState state) {
    final notifier = ref.read(organizationsProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Join with code card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'JOIN WITH INVITE CODE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0, color: ZoopColors.textMuted),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        label: 'Organization invite code input',
                        child: TextField(
                          controller: _joinCodeController,
                          style: const TextStyle(color: ZoopColors.textPrimary, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'Paste invite token or code...',
                            hintStyle: const TextStyle(color: ZoopColors.textMuted, fontSize: 12),
                            filled: true,
                            fillColor: ZoopColors.surfaceElevated,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: ZoopColors.surfaceBorder),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Semantics(
                      label: 'Join organization with invite code',
                      button: true,
                      child: ElevatedButton(
                        onPressed: _handleJoinOrgWithCode,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ZoopColors.primaryCyan,
                          foregroundColor: Colors.black,
                          minimumSize: const Size(80, 46),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Join', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Pending Invitations
          if (state.pendingInvitations.isNotEmpty) ...[
            _buildSectionHeader('PENDING INVITATIONS', ZoopColors.accentAmber),
            const SizedBox(height: 8),
            ...state.pendingInvitations.map((invite) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.mail_outline, color: ZoopColors.primaryCyan, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                invite.orgName,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Invited by ${invite.inviterName} • ${invite.role.label}',
                                style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
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
                        Semantics(
                          label: 'Decline invitation to join ${invite.orgName}',
                          button: true,
                          child: TextButton(
                            onPressed: () => notifier.declineInvitation(invite.id),
                            style: TextButton.styleFrom(
                              minimumSize: const Size(80, 44),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            ),
                            child: const Text('Decline', style: TextStyle(color: ZoopColors.textMuted)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Semantics(
                          label: 'Accept invitation to join ${invite.orgName}',
                          button: true,
                          child: ElevatedButton(
                            onPressed: () => notifier.acceptInvitation(invite.id),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ZoopColors.primaryCyan,
                              foregroundColor: Colors.black,
                              minimumSize: const Size(120, 44),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: const Text('Accept & Join', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
          ],

          // Active Organizations
          _buildSectionHeader('ENROLLED ORGANIZATIONS (${state.organizations.length})', ZoopColors.primaryCyan),
          const SizedBox(height: 8),
          if (state.organizations.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(36),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: const Column(
                children: [
                  Icon(Icons.corporate_fare, size: 52, color: ZoopColors.textMuted),
                  SizedBox(height: 12),
                  Text(
                    'No Enrolled Organizations',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Join an enterprise network or community mesh to share secure egress policies.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                  ),
                ],
              ),
            )
          else
            ...state.organizations.map((org) {
              return Semantics(
                label: '${org.name}, ${org.deviceCount} nodes, role ${org.role.label}. Double tap to view organization details.',
                button: true,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: ZoopColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: ZoopColors.surfaceBorder),
                  ),
                  child: ListTile(
                    onTap: () => _showOrgDetails(context, org),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.business, color: ZoopColors.primaryCyan, size: 20),
                    ),
                    title: Text(org.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text(
                      '${org.deviceCount} nodes • ${org.role.label}',
                      style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
                    ),
                    trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
                  ),
                ),
              );
            }),
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
