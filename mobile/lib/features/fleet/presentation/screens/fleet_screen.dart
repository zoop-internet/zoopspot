import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/zoop_colors.dart';
import '../../../devices/application/devices_notifier.dart';
import '../../../devices/domain/fleet_device_model.dart';
import '../../../devices/presentation/widgets/device_details_sheet.dart';
import '../../../organizations/application/organizations_notifier.dart';
import '../../../organizations/domain/organization_models.dart';
import '../../../organizations/presentation/widgets/organization_details_sheet.dart';
import '../../../pairing/presentation/widgets/pairing_sheet.dart';

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
    _tabController = TabController(length: 2, vsync: this);
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
      builder: (ctx) => const PairingSheet(),
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
              'Fleet & Trust Network',
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
            icon: const Icon(Icons.refresh, color: ZoopColors.textSecondary),
            tooltip: 'Refresh',
            onPressed: () {
              ref.read(devicesProvider.notifier).refreshDevices();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Refreshed fleet and organization nodes'),
                  duration: Duration(milliseconds: 1000),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: ZoopColors.textSecondary),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            height: 38,
            decoration: BoxDecoration(
              color: ZoopColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: ZoopColors.primaryCyan.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: ZoopColors.primaryCyan.withValues(alpha: 0.5)),
              ),
              labelColor: ZoopColors.primaryCyan,
              unselectedLabelColor: ZoopColors.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.devices, size: 16),
                      const SizedBox(width: 6),
                      Text('My Devices (${devicesState.devices.length})'),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.business, size: 16),
                      const SizedBox(width: 6),
                      Text('Organizations (${orgsState.organizations.length})'),
                    ],
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
          // Tab 0: My Devices
          _buildDevicesTab(context, devicesState),
          // Tab 1: Organizations
          _buildOrganizationsTab(context, orgsState),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showActionMenu(context),
        backgroundColor: ZoopColors.primaryCyan,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add),
        label: const Text('Add Node', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  void _showActionMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: ZoopColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.qr_code_scanner, color: ZoopColors.primaryCyan),
                ),
                title: const Text('Pair New Device (QR / PIN)', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Link a phone, laptop, or home router to your fleet'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _showPairingSheet(context);
                },
              ),
              const Divider(color: ZoopColors.surfaceBorder),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: ZoopColors.accentPurple.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.domain_add, color: ZoopColors.accentPurple),
                ),
                title: const Text('Join Organization', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Connect to an enterprise or community mesh'),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _tabController.animateTo(1);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDevicesTab(BuildContext context, DevicesState state) {
    final onlineDevices = state.devices.where((d) => d.isOnline).toList();
    final offlineDevices = state.devices.where((d) => !d.isOnline).toList();

    return RefreshIndicator(
      color: ZoopColors.primaryCyan,
      backgroundColor: ZoopColors.surface,
      onRefresh: () async {
        ref.read(devicesProvider.notifier).refreshDevices();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Fleet Overview Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: ZoopColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: ZoopColors.surfaceBorder),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: ZoopColors.primaryCyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.hub_outlined, color: ZoopColors.primaryCyan, size: 26),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Personal Mesh Fleet',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${onlineDevices.length} online • ${state.devices.length} total nodes enrolled',
                          style: const TextStyle(fontSize: 12, color: ZoopColors.accentGreen, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => _showPairingSheet(context),
                    icon: const Icon(Icons.qr_code, size: 16),
                    label: const Text('Pair'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      side: const BorderSide(color: ZoopColors.primaryCyan),
                      foregroundColor: ZoopColors.primaryCyan,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Online Nodes Section
            if (onlineDevices.isNotEmpty) ...[
              _buildSectionHeader('ACTIVE NODES (${onlineDevices.length})', ZoopColors.accentGreen),
              const SizedBox(height: 8),
              ...onlineDevices.map((dev) => _buildDeviceCard(context, dev)),
              const SizedBox(height: 16),
            ],

            // Offline Nodes Section
            if (offlineDevices.isNotEmpty) ...[
              _buildSectionHeader('STANDBY / OFFLINE (${offlineDevices.length})', ZoopColors.textMuted),
              const SizedBox(height: 8),
              ...offlineDevices.map((dev) => _buildDeviceCard(context, dev)),
            ],

            if (state.devices.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(40),
                decoration: BoxDecoration(
                  color: ZoopColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ZoopColors.surfaceBorder),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.devices_other, size: 56, color: ZoopColors.textMuted),
                    const SizedBox(height: 14),
                    const Text(
                      'No Enrolled Devices',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ZoopColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Pair your phone, laptop, or home edge router using secure QR exchange.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: ZoopColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () => _showPairingSheet(context),
                      icon: const Icon(Icons.qr_code_scanner),
                      label: const Text('Pair First Device'),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ZoopColors.surfaceBorder),
      ),
      child: ListTile(
        onTap: () => _showDeviceSheet(context, dev),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
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
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dev.isOnline ? ZoopColors.accentGreen : ZoopColors.textMuted,
                  border: Border.all(color: ZoopColors.surface, width: 1.5),
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
        subtitle: Text(
          '${dev.ipAddress} • ${dev.platform} • ${dev.role.label}',
          style: const TextStyle(fontSize: 11, color: ZoopColors.textMuted),
        ),
        trailing: const Icon(Icons.chevron_right, color: ZoopColors.textMuted),
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
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _handleJoinOrgWithCode,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ZoopColors.primaryCyan,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Join', style: TextStyle(fontWeight: FontWeight.bold)),
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
                        TextButton(
                          onPressed: () => notifier.declineInvitation(invite.id),
                          child: const Text('Decline', style: TextStyle(color: ZoopColors.textMuted)),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => notifier.acceptInvitation(invite.id),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ZoopColors.primaryCyan,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Accept & Join', style: TextStyle(fontWeight: FontWeight.bold)),
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
              return Container(
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
