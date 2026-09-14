class PeerDevice {
  final String id;
  final String endpointId;
  final String name;
  final String platform;
  final String status;
  final String? wireguardPublicKey;
  final String? ed25519PublicKey;
  final List<String> endpoints;

  const PeerDevice({
    required this.id,
    required this.endpointId,
    required this.name,
    this.platform = 'linux',
    this.status = 'trusted',
    this.wireguardPublicKey,
    this.ed25519PublicKey,
    this.endpoints = const [],
  });

  factory PeerDevice.fromJson(Map<String, dynamic> json) {
    String epId = (json['endpoint_id'] as String? ?? '').trim();
    if (epId.isEmpty || epId == '00000000-0000-0000-0000-000000000000') {
      epId = (json['id'] as String? ?? '').trim();
    }
    return PeerDevice(
      id: json['id'] as String? ?? '',
      endpointId: epId,
      name: json['name'] as String? ?? 'Unnamed Node',
      platform: (json['os'] ?? json['platform']) as String? ?? 'linux',
      status: json['status'] as String? ?? 'trusted',
      wireguardPublicKey: json['wireguard_public_key'] as String?,
      ed25519PublicKey: json['public_key'] as String?,
      endpoints: (json['endpoints'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  bool get isOnline => status == 'trusted' || status == 'registered' || status == 'active';

  PeerDevice copyWith({
    String? id,
    String? endpointId,
    String? name,
    String? platform,
    String? status,
    String? wireguardPublicKey,
    String? ed25519PublicKey,
    List<String>? endpoints,
  }) {
    return PeerDevice(
      id: id ?? this.id,
      endpointId: endpointId ?? this.endpointId,
      name: name ?? this.name,
      platform: platform ?? this.platform,
      status: status ?? this.status,
      wireguardPublicKey: wireguardPublicKey ?? this.wireguardPublicKey,
      ed25519PublicKey: ed25519PublicKey ?? this.ed25519PublicKey,
      endpoints: endpoints ?? this.endpoints,
    );
  }
}
