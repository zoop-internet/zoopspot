import 'package:flutter/material.dart';
import '../../../../core/theme/zoop_colors.dart';

class GatewayItem {
  final String id;
  final String name;
  final String location;
  final String flag;
  final int pingMs;
  final int loadPercent;
  final bool isRecommended;

  const GatewayItem({
    required this.id,
    required this.name,
    required this.location,
    required this.flag,
    required this.pingMs,
    required this.loadPercent,
    this.isRecommended = false,
  });
}

class GatewaySelectorSheet extends StatefulWidget {
  final String currentGatewayId;
  final bool isFullInternet;
  final ValueChanged<GatewayItem> onSelectGateway;
  final ValueChanged<bool> onToggleFullInternet;

  const GatewaySelectorSheet({
    super.key,
    required this.currentGatewayId,
    required this.isFullInternet,
    required this.onSelectGateway,
    required this.onToggleFullInternet,
  });

  static const List<GatewayItem> defaultGateways = [
    GatewayItem(
      id: 'gw-fra-01',
      name: 'Frankfurt #1',
      location: 'Frankfurt, Germany',
      flag: '🇩🇪',
      pingMs: 24,
      loadPercent: 32,
      isRecommended: true,
    ),
    GatewayItem(
      id: 'gw-ams-02',
      name: 'Amsterdam #2',
      location: 'Amsterdam, Netherlands',
      flag: '🇳🇱',
      pingMs: 31,
      loadPercent: 48,
    ),
    GatewayItem(
      id: 'gw-dxb-03',
      name: 'Dubai #3',
      location: 'Dubai, UAE',
      flag: '🇦🇪',
      pingMs: 78,
      loadPercent: 19,
    ),
    GatewayItem(
      id: 'gw-zrh-04',
      name: 'Zurich Secure',
      location: 'Zurich, Switzerland',
      flag: '🇨🇭',
      pingMs: 28,
      loadPercent: 15,
      isRecommended: true,
    ),
    GatewayItem(
      id: 'gw-sin-05',
      name: 'Singapore Fast',
      location: 'Singapore, SG',
      flag: '🇸🇬',
      pingMs: 142,
      loadPercent: 55,
    ),
    GatewayItem(
      id: 'gw-tyo-06',
      name: 'Tokyo Metro',
      location: 'Tokyo, Japan',
      flag: '🇯🇵',
      pingMs: 165,
      loadPercent: 62,
    ),
  ];

  @override
  State<GatewaySelectorSheet> createState() => _GatewaySelectorSheetState();
}

class _GatewaySelectorSheetState extends State<GatewaySelectorSheet> {
  late bool _fullInternet;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fullInternet = widget.isFullInternet;
  }

  Color _getPingColor(int ping) {
    if (ping < 50) return ZoopColors.accentGreen;
    if (ping < 100) return ZoopColors.accentAmber;
    return ZoopColors.accentRose;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = GatewaySelectorSheet.defaultGateways.where((gw) {
      final q = _searchQuery.toLowerCase();
      return gw.name.toLowerCase().contains(q) ||
          gw.location.toLowerCase().contains(q);
    }).toList();

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        left: 20,
        right: 20,
        top: 16,
      ),
      decoration: const BoxDecoration(
        color: ZoopColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: ZoopColors.surfaceBorder)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: ZoopColors.surfaceBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: ZoopColors.primaryCyan.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.public,
                    color: ZoopColors.primaryCyan, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Select Egress Gateway',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: ZoopColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Choose your exit relay or intranet mesh route',
                      style: TextStyle(fontSize: 12, color: ZoopColors.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Routing Mode Switcher Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: ZoopColors.surfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: ZoopColors.surfaceBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fullInternet ? 'Full Internet Egress' : 'Intranet Mesh Only',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: ZoopColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _fullInternet
                            ? 'Route all browser & app traffic via gateway'
                            : 'Only route traffic to private mesh nodes',
                        style: const TextStyle(
                            fontSize: 11, color: ZoopColors.textMuted),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _fullInternet,
                  activeThumbColor: ZoopColors.primaryCyan,
                  onChanged: (val) {
                    setState(() => _fullInternet = val);
                    widget.onToggleFullInternet(val);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Search Field
          TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            style: const TextStyle(fontSize: 13, color: ZoopColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Search city, country, or node...',
              hintStyle:
                  const TextStyle(fontSize: 12, color: ZoopColors.textMuted),
              prefixIcon: const Icon(Icons.search,
                  size: 18, color: ZoopColors.textMuted),
              filled: true,
              fillColor: ZoopColors.surfaceElevated,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Gateway List
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 280),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: filtered.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (ctx, idx) {
                final gw = filtered[idx];
                final isSelected = gw.id == widget.currentGatewayId ||
                    gw.name == widget.currentGatewayId;
                final pingColor = _getPingColor(gw.pingMs);

                return InkWell(
                  onTap: () {
                    widget.onSelectGateway(gw);
                    Navigator.of(context).pop();
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? ZoopColors.primaryCyan.withValues(alpha: 0.12)
                          : ZoopColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? ZoopColors.primaryCyan
                            : ZoopColors.surfaceBorder,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(gw.flag, style: const TextStyle(fontSize: 20)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    gw.name,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: isSelected
                                          ? ZoopColors.primaryCyan
                                          : ZoopColors.textPrimary,
                                    ),
                                  ),
                                  if (gw.isRecommended) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: ZoopColors.accentGreen
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'FASTEST',
                                        style: TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                          color: ZoopColors.accentGreen,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                gw.location,
                                style: const TextStyle(
                                    fontSize: 11, color: ZoopColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: pingColor,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${gw.pingMs} ms',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: pingColor,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Load: ${gw.loadPercent}%',
                              style: const TextStyle(
                                  fontSize: 10, color: ZoopColors.textMuted),
                            ),
                          ],
                        ),
                        if (isSelected) ...[
                          const SizedBox(width: 10),
                          const Icon(Icons.check_circle,
                              color: ZoopColors.primaryCyan, size: 18),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
