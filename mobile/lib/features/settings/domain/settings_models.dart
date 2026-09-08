import '../../../../core/models/routing_mode.dart';

class AppSettings {
  final RoutingMode defaultRoutingMode;
  final int mtuClamping;
  final bool killSwitchEnabled;
  final bool biometricsEnabled;
  final bool hasPinSet;
  final bool telemetryEnabled;
  final bool notifyOnConnection;
  final bool notifyOnPeerRequest;
  final bool notifyOnSecurityAlert;

  const AppSettings({
    this.defaultRoutingMode = RoutingMode.fullInternet,
    this.mtuClamping = 1420,
    this.killSwitchEnabled = true,
    this.biometricsEnabled = true,
    this.hasPinSet = true,
    this.telemetryEnabled = false,
    this.notifyOnConnection = true,
    this.notifyOnPeerRequest = true,
    this.notifyOnSecurityAlert = true,
  });

  AppSettings copyWith({
    RoutingMode? defaultRoutingMode,
    int? mtuClamping,
    bool? killSwitchEnabled,
    bool? biometricsEnabled,
    bool? hasPinSet,
    bool? telemetryEnabled,
    bool? notifyOnConnection,
    bool? notifyOnPeerRequest,
    bool? notifyOnSecurityAlert,
  }) {
    return AppSettings(
      defaultRoutingMode: defaultRoutingMode ?? this.defaultRoutingMode,
      mtuClamping: mtuClamping ?? this.mtuClamping,
      killSwitchEnabled: killSwitchEnabled ?? this.killSwitchEnabled,
      biometricsEnabled: biometricsEnabled ?? this.biometricsEnabled,
      hasPinSet: hasPinSet ?? this.hasPinSet,
      telemetryEnabled: telemetryEnabled ?? this.telemetryEnabled,
      notifyOnConnection: notifyOnConnection ?? this.notifyOnConnection,
      notifyOnPeerRequest: notifyOnPeerRequest ?? this.notifyOnPeerRequest,
      notifyOnSecurityAlert: notifyOnSecurityAlert ?? this.notifyOnSecurityAlert,
    );
  }
}
