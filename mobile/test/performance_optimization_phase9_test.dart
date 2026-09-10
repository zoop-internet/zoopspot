import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/models/connection_state.dart';
import 'package:zoop_mobile/core/models/peer_device.dart';
import 'package:zoop_mobile/features/dashboard/presentation/widgets/active_sharing_banner.dart';
import 'package:zoop_mobile/features/dashboard/presentation/widgets/mesh_visualizer_card.dart';
import 'package:zoop_mobile/features/dashboard/presentation/widgets/zoop_points_card.dart';
import 'package:zoop_mobile/features/sharing/application/sharing_notifier.dart';
import 'package:zoop_mobile/features/sharing/presentation/widgets/sharing_orb_hero.dart';

void main() {
  group('Performance, Memory & Resource Optimization (Phase 9)', () {
    testWidgets('MeshVisualizerCard contains RepaintBoundary for paint isolation',
        (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: _TestMeshHost(),
            ),
          ),
        ),
      );

      expect(find.byType(MeshVisualizerCard), findsOneWidget);

      // Verify RepaintBoundary widgets exist within MeshVisualizerCard
      final boundaries = find.descendant(
        of: find.byType(MeshVisualizerCard),
        matching: find.byType(RepaintBoundary),
      );
      expect(boundaries, findsAtLeastNWidgets(2));
    });

    testWidgets('SharingOrbHero contains RepaintBoundary for animated orb isolation',
        (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: _TestSharingHost(),
            ),
          ),
        ),
      );

      expect(find.byType(SharingOrbHero), findsOneWidget);

      // Verify RepaintBoundary exists inside SharingOrbHero
      final boundaries = find.descendant(
        of: find.byType(SharingOrbHero),
        matching: find.byType(RepaintBoundary),
      );
      expect(boundaries, findsAtLeastNWidgets(1));
    });

    testWidgets('ActiveSharingBanner renders reactively without throwing',
        (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: ActiveSharingBanner(),
            ),
          ),
        ),
      );

      expect(find.byType(ActiveSharingBanner), findsOneWidget);
      expect(find.text('SHARING ACTIVE'), findsOneWidget);
    });

    testWidgets('ZoopPointsCard renders reactively as ConsumerWidget',
        (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: ZoopPointsCard(),
            ),
          ),
        ),
      );

      expect(find.byType(ZoopPointsCard), findsOneWidget);
      expect(find.text('ZOOP POINTS'), findsOneWidget);
    });
  });
}

class _TestMeshHost extends StatefulWidget {
  const _TestMeshHost();

  @override
  State<_TestMeshHost> createState() => _TestMeshHostState();
}

class _TestMeshHostState extends State<_TestMeshHost>
    with TickerProviderStateMixin {
  late AnimationController _rotCtrl;
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _rotCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2));
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 1));
  }

  @override
  void dispose() {
    _rotCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MeshVisualizerCard(
      status: ConnectionStatus.connectedDirect,
      activePeer: const PeerDevice(
        id: 'peer-test',
        endpointId: 'ep-test',
        name: 'Node Alpha',
        platform: 'Android',
      ),
      isConnected: true,
      isConnecting: false,
      rotationController: _rotCtrl,
      pulseAnimation: _pulseCtrl,
      onSelectPeer: () {},
    );
  }
}

class _TestSharingHost extends StatefulWidget {
  const _TestSharingHost();

  @override
  State<_TestSharingHost> createState() => _TestSharingHostState();
}

class _TestSharingHostState extends State<_TestSharingHost>
    with TickerProviderStateMixin {
  late AnimationController _rotCtrl;
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _rotCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 2));
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 1));
  }

  @override
  void dispose() {
    _rotCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SharingOrbHero(
      isSharing: true,
      state: const SharingState(),
      onToggleSharing: () {},
      pulseAnimation: _pulseCtrl,
      rotationController: _rotCtrl,
      sessionPin: 'ZP-1234',
      inviteLink: 'https://zoop.link/share/ZP-1234',
      onShowQr: () {},
    );
  }
}
