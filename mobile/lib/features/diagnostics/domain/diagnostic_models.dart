enum NATType { fullCone, restrictedCone, portRestrictedCone, symmetric, unknown }

enum CheckStatus { running, passed, failed, skipped }

class DiagnosticCheck {
  final String name;
  final CheckStatus status;
  final Duration? latency;
  final String message;
  final String? details;

  const DiagnosticCheck({
    required this.name,
    required this.status,
    this.latency,
    required this.message,
    this.details,
  });

  DiagnosticCheck copyWith({
    String? name,
    CheckStatus? status,
    Duration? latency,
    String? message,
    String? details,
  }) {
    return DiagnosticCheck(
      name: name ?? this.name,
      status: status ?? this.status,
      latency: latency ?? this.latency,
      message: message ?? this.message,
      details: details ?? this.details,
    );
  }
}

class DiagnosticsReport {
  final DateTime timestamp;
  final String agentVersion;
  final bool healthy;
  final List<DiagnosticCheck> checks;
  final NATType? natType;
  final int? pathMTU;
  final bool? dnsLeakDetected;
  final double? latencyMs;
  final double? throughputKbps;

  const DiagnosticsReport({
    required this.timestamp,
    required this.agentVersion,
    required this.healthy,
    required this.checks,
    this.natType,
    this.pathMTU,
    this.dnsLeakDetected,
    this.latencyMs,
    this.throughputKbps,
  });
}

enum DPDState { alive, suspect, dead }

class SelfHealingStatus {
  final bool active;
  final DPDState peerState;
  final int retryCount;
  final Duration? nextRetryIn;
  final String? lastFailoverEvent;
  final DateTime? lastFailoverTime;

  const SelfHealingStatus({
    required this.active,
    required this.peerState,
    required this.retryCount,
    this.nextRetryIn,
    this.lastFailoverEvent,
    this.lastFailoverTime,
  });
}
