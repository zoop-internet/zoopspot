class IdentityModel {
  final String? zoopId;
  final String? endpointId;
  final String? deviceName;
  final String? ed25519PublicKeyB64;
  final String? wireguardPublicKeyB64;
  final bool isRegistered;
  final bool isLoading;
  final String? cloudUrl;
  final String? errorMessage;
  final String? cloudStatus;

  const IdentityModel({
    this.zoopId,
    this.endpointId,
    this.deviceName,
    this.ed25519PublicKeyB64,
    this.wireguardPublicKeyB64,
    this.isRegistered = false,
    this.isLoading = false,
    this.cloudUrl,
    this.errorMessage,
    this.cloudStatus,
  });

  bool get hasIdentity => zoopId != null && zoopId!.isNotEmpty && ed25519PublicKeyB64 != null;

  IdentityModel copyWith({
    String? zoopId,
    String? endpointId,
    String? deviceName,
    String? ed25519PublicKeyB64,
    String? wireguardPublicKeyB64,
    bool? isRegistered,
    bool? isLoading,
    String? cloudUrl,
    String? errorMessage,
    String? cloudStatus,
  }) {
    return IdentityModel(
      zoopId: zoopId ?? this.zoopId,
      endpointId: endpointId ?? this.endpointId,
      deviceName: deviceName ?? this.deviceName,
      ed25519PublicKeyB64: ed25519PublicKeyB64 ?? this.ed25519PublicKeyB64,
      wireguardPublicKeyB64: wireguardPublicKeyB64 ?? this.wireguardPublicKeyB64,
      isRegistered: isRegistered ?? this.isRegistered,
      isLoading: isLoading ?? this.isLoading,
      cloudUrl: cloudUrl ?? this.cloudUrl,
      errorMessage: errorMessage,
      cloudStatus: cloudStatus ?? this.cloudStatus,
    );
  }
}
