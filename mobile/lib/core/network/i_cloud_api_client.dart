import '../models/peer_device.dart';

class CloudApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;

  CloudApiException({
    required this.code,
    required this.message,
    required this.statusCode,
  });

  @override
  String toString() => 'CloudApiException($statusCode, code: $code, message: $message)';
}

class DeviceRegistrationResponse {
  final String id;
  final String endpointId;
  final String status;

  DeviceRegistrationResponse({
    required this.id,
    required this.endpointId,
    required this.status,
  });

  factory DeviceRegistrationResponse.fromJson(Map<String, dynamic> json) {
    return DeviceRegistrationResponse(
      id: json['id'] as String? ?? '',
      endpointId: (json['endpoint_id'] ?? json['id']) as String? ?? '',
      status: json['status'] as String? ?? 'trusted',
    );
  }
}

/// Abstract contract for the Zoop Cloud Control Plane API client.
abstract class ICloudApiClient {
  /// Base URL of the cloud control plane.
  String get baseUrl;

  /// Checks if the cloud control plane is healthy and reachable.
  Future<bool> checkHealth();

  /// Registers a new device record with the cloud control plane.
  Future<DeviceRegistrationResponse> registerDevice({
    required String name,
    required String ed25519PublicKeyB64,
    required String wireguardPublicKeyB64,
    String platform = 'android',
    List<String> capabilities = const ['vpn', 'recipient', 'provider'],
  });

  /// Performs an authenticated HTTP request using the zoop-auth cryptographic protocol.
  Future<dynamic> authenticatedRequest({
    required String method,
    required String path,
    required String endpointId,
    required List<int> privateKeySeed,
    Map<String, dynamic>? body,
  });

  /// Fetches registered device details from the cloud.
  Future<Map<String, dynamic>> getDevice({
    required String endpointId,
    required List<int> privateKeySeed,
  });

  /// Lists accessible peer devices in the network mesh.
  Future<List<PeerDevice>> listDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  });

  /// Fetches endpoint candidates and keys for a target peer device.
  Future<Map<String, dynamic>> getDeviceEndpoints({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
  });

  /// Creates a registered connection session with the cloud control plane.
  Future<Map<String, dynamic>> createConnection({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
    String? wireguardPublicKey,
    List<dynamic>? candidates,
  });

  /// Lists active shares for this device.
  Future<Map<String, dynamic>> listShares({
    required String endpointId,
    required List<int> privateKeySeed,
  });

  /// Generates an ephemeral pairing token to pair another device to this identity.
  Future<Map<String, dynamic>> createPairingToken({
    required String endpointId,
    required List<int> privateKeySeed,
    int expiresInSeconds = 600,
  });

  /// Claims a pairing token to mutually link with the issuing device.
  Future<Map<String, dynamic>> claimPairingToken({
    required String endpointId,
    required String code,
    required List<int> privateKeySeed,
  });

  /// Lists all paired devices in the user's personal mesh fleet.
  Future<List<Map<String, dynamic>>> getFleetDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  });

  /// Submits client-side diagnostic report telemetry.
  Future<Map<String, dynamic>> submitDiagnosticReport(Map<String, dynamic> report);

  /// Retrieves historical diagnostic telemetry reports.
  Future<List<Map<String, dynamic>>> getDiagnosticReports(String deviceId);

  /// Fetches the user/device authoritative wallet ledger from the cloud.
  Future<Map<String, dynamic>> getWallet({
    required String endpointId,
    required List<int> privateKeySeed,
  });

  /// Initiates a Mobile Money deposit via the cloud server.
  Future<Map<String, dynamic>> depositMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  });

  /// Initiates a Card deposit via the cloud server.
  Future<Map<String, dynamic>> depositCard({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    String? callbackUrl,
    String? description,
  });

  /// Initiates a Mobile Money withdrawal via the cloud server.
  Future<Map<String, dynamic>> withdrawMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  });

  /// Lists wallet transactions from the cloud server.
  Future<Map<String, dynamic>> listWalletTransactions({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  });

  /// Lists wallet earnings from the cloud server.
  Future<Map<String, dynamic>> listWalletEarnings({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  });

  /// Queries payment transaction status for asynchronous confirmation (e.g. Mobile Money USSD / Card).
  Future<Map<String, dynamic>> checkTransactionStatus({
    required String endpointId,
    required List<int> privateKeySeed,
    required String referenceId,
  });
}
