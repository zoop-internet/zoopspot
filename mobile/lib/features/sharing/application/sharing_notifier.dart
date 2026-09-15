import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/sharing_models.dart';

class SharingState {
  final bool isSharingActive;
  final SharingStatus status;
  final double currentEgressMbps;
  final double usedTodayGb;
  final List<ConnectedRecipientItem> recipients;
  final List<InboundSharingRequestItem> pendingRequests;
  final SharingPolicy policy;

  const SharingState({
    this.isSharingActive = false,
    this.status = SharingStatus.disabled,
    this.currentEgressMbps = 0.0,
    this.usedTodayGb = 0.0,
    this.recipients = const [],
    this.pendingRequests = const [],
    this.policy = const SharingPolicy(),
  });

  SharingState copyWith({
    bool? isSharingActive,
    SharingStatus? status,
    double? currentEgressMbps,
    double? usedTodayGb,
    List<ConnectedRecipientItem>? recipients,
    List<InboundSharingRequestItem>? pendingRequests,
    SharingPolicy? policy,
  }) {
    return SharingState(
      isSharingActive: isSharingActive ?? this.isSharingActive,
      status: status ?? this.status,
      currentEgressMbps: currentEgressMbps ?? this.currentEgressMbps,
      usedTodayGb: usedTodayGb ?? this.usedTodayGb,
      recipients: recipients ?? this.recipients,
      pendingRequests: pendingRequests ?? this.pendingRequests,
      policy: policy ?? this.policy,
    );
  }
}

class SharingNotifier extends StateNotifier<SharingState> {
  Timer? _ticker;

  SharingNotifier() : super(const SharingState()) {
    _startThroughputSimulator();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _loadInitialData() {
    state = state.copyWith(
      recipients: const [],
      pendingRequests: const [],
    );
  }

  void _startThroughputSimulator() {
    _ticker = Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted || !state.isSharingActive || state.recipients.isEmpty) return;
      final updatedRecipients = state.recipients.map((r) {
        final addedBytes = r.currentRateKbps * 250;
        return r.copyWith(
          totalTransferredBytes: r.totalTransferredBytes + addedBytes,
        );
      }).toList();

      final addedGb = 0.002;
      state = state.copyWith(
        recipients: updatedRecipients,
        usedTodayGb: double.parse((state.usedTodayGb + addedGb).toStringAsFixed(3)),
      );
    });
  }

  void toggleSharing() {
    final next = !state.isSharingActive;
    state = state.copyWith(
      isSharingActive: next,
      status: next
          ? (state.recipients.isNotEmpty ? SharingStatus.active : SharingStatus.idle)
          : SharingStatus.disabled,
      currentEgressMbps: next ? 3.7 : 0.0,
    );
  }

  void approveRequest(String requestId) {
    final reqIndex = state.pendingRequests.indexWhere((r) => r.id == requestId);
    if (reqIndex == -1) return;
    final req = state.pendingRequests[reqIndex];

    final newRecipient = ConnectedRecipientItem(
      id: 'rec-${DateTime.now().millisecondsSinceEpoch}',
      peerZoopId: req.requesterZoopId,
      name: req.name,
      platform: req.platform,
      connectedSince: DateTime.now(),
      currentRateKbps: req.requestedBandwidthMbps * 1000,
      totalTransferredBytes: 50000,
      assignedVirtualIp: '10.99.1.${state.recipients.length + 20}',
    );

    final updatedRequests = List<InboundSharingRequestItem>.from(state.pendingRequests)
      ..removeAt(reqIndex);

    state = state.copyWith(
      recipients: [newRecipient, ...state.recipients],
      pendingRequests: updatedRequests,
      status: SharingStatus.active,
    );
  }

  void rejectRequest(String requestId) {
    final updatedRequests =
        state.pendingRequests.where((r) => r.id != requestId).toList();
    state = state.copyWith(pendingRequests: updatedRequests);
  }

  void blockRequester(String requestId) {
    rejectRequest(requestId);
  }

  void revokeRecipient(String recipientId) {
    final updated = state.recipients.where((r) => r.id != recipientId).toList();
    state = state.copyWith(
      recipients: updated,
      status: updated.isEmpty ? SharingStatus.idle : SharingStatus.active,
    );
  }

  void updatePolicy(SharingPolicy policy) {
    state = state.copyWith(policy: policy);
  }
}

final sharingProvider =
    StateNotifierProvider<SharingNotifier, SharingState>((ref) {
  return SharingNotifier();
});
