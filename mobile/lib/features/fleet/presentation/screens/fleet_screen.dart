import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../../core/theme/zoop_spacing.dart';
import '../../../../core/widgets/zoop_empty_state.dart';
import '../../../../core/widgets/zoop_error_banner.dart';
import '../../../../core/widgets/zoop_shimmer.dart';
import '../../../devices/application/devices_notifier.dart';
import '../../../devices/domain/fleet_device_model.dart';
import '../../../devices/presentation/widgets/device_details_sheet.dart';
import '../../../organizations/application/organizations_notifier.dart';
import '../../../organizations/domain/organization_models.dart';
import '../../../organizations/presentation/widgets/organization_details_sheet.dart';
import '../widgets/device_pairing_sheet.dart';
import '../widgets/fleet_device_card.dart';
import '../widgets/fleet_gateways_tab.dart';
import '../widgets/fleet_mesh_overview_card.dart';
import '../widgets/fleet_organizations_tab.dart';

/// Primary Fleet Management screen allowing mesh device enrollment,
/// gateway & exit node routing, and multi-tenant organization access.
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
    final devicesNotifier = ref.read(devicesProvider.notifier);
    final orgsNotifier = ref.read(organizationsProvider.notifier);

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
                devicesNotifier.refreshDevices();
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
          FleetGatewaysTab(
            state: devicesState,
            onRefresh: () async => devicesNotifier.refreshDevices(),
            onToggleExitNode: (id) => devicesNotifier.toggleExitNode(id),
            onShowDeviceSheet: (dev) => _showDeviceSheet(context, dev),
            onDeployGateway: () => _showPairingSheet(context),
          ),
          // Tab 2: Organizations
          FleetOrganizationsTab(
            state: orgsState,
            joinCodeController: _joinCodeController,
            onJoinWithCode: _handleJoinOrgWithCode,
            onAcceptInvitation: (id) => orgsNotifier.acceptInvitation(id),
            onDeclineInvitation: (id) => orgsNotifier.declineInvitation(id),
            onShowOrgDetails: (org) => _showOrgDetails(context, org),
          ),
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
            FleetMeshOverviewCard(
              onlineCount: onlineDevices.length,
              totalCount: state.devices.length,
              activeExit: activeExit,
              onPair: () => _showPairingSheet(context),
              onDisconnectExit: () {
                if (activeExit != null) {
                  ref.read(devicesProvider.notifier).toggleExitNode(activeExit.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Exit node routing disconnected'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                }
              },
            ),
            ZoopSpacing.gapXl,

            // Online Nodes Section
            if (onlineDevices.isNotEmpty) ...[
              _buildSectionHeader('ACTIVE SHARING NODES (${onlineDevices.length})', ZoopColors.accentGreen),
              ZoopSpacing.gapSm,
              for (final dev in onlineDevices)
                FleetDeviceCard(
                  key: ValueKey(dev.id),
                  dev: dev,
                  onTap: () => _showDeviceSheet(context, dev),
                ),
              ZoopSpacing.gapLg,
            ],

            // Offline Nodes Section
            if (offlineDevices.isNotEmpty) ...[
              _buildSectionHeader('OFFLINE / STANDBY (${offlineDevices.length})', ZoopColors.textMuted),
              ZoopSpacing.gapSm,
              for (final dev in offlineDevices)
                FleetDeviceCard(
                  key: ValueKey(dev.id),
                  dev: dev,
                  onTap: () => _showDeviceSheet(context, dev),
                ),
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
