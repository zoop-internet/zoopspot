import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../crypto/crypto_service.dart';
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

class CloudApiClient {
  final String baseUrl;
  final http.Client _client;
  final CryptoService _cryptoService;
  final Uuid _uuid = const Uuid();

  CloudApiClient({
    String? baseUrl,
    http.Client? client,
    CryptoService? cryptoService,
  })  : baseUrl = (baseUrl != null && baseUrl.isNotEmpty)
            ? baseUrl
            : 'https://3.70.135.200.sslip.io',
        _client = client ?? http.Client(),
        _cryptoService = cryptoService ?? CryptoService();

  /// Checks if the cloud control plane is healthy and reachable.
  Future<bool> checkHealth() async {
    try {
      final uri = Uri.parse('$baseUrl/v1/health');
      final response = await _client.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        return data['status'] == 'ok';
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Registers a new device record with the cloud control plane.
  /// This endpoint (/v1/devices) does not require Zoop-Auth headers as the device
  /// identity is being established for the first time.
  Future<DeviceRegistrationResponse> registerDevice({
    required String name,
    required String ed25519PublicKeyB64,
    required String wireguardPublicKeyB64,
    String platform = 'android',
    List<String> capabilities = const ['vpn', 'recipient', 'provider'],
  }) async {
    final uri = Uri.parse('$baseUrl/v1/devices');
    final payload = {
      'name': name,
      'platform': platform,
      'public_key': ed25519PublicKeyB64,
      'wireguard_public_key': wireguardPublicKeyB64,
      'capabilities': capabilities,
    };

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: json.encode(payload),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      return DeviceRegistrationResponse.fromJson(data);
    } else {
      _throwError(response);
    }
  }

  /// Performs an authenticated HTTP request using the zoop-auth-v2 cryptographic protocol.
  Future<dynamic> authenticatedRequest({
    required String method,
    required String path,
    required String endpointId,
    required List<int> privateKeySeed,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final timestampIso = DateTime.now().toUtc().toIso8601String();
    final nonce = _uuid.v4();
    final bodyJsonStr = body != null ? json.encode(body) : '';

    final canonicalPayload = _cryptoService.buildCanonicalPayload(
      method: method,
      path: path,
      timestampIso: timestampIso,
      nonce: nonce,
      body: bodyJsonStr,
    );

    final signatureBytes = await _cryptoService.signPayload(
      privateKeySeed: privateKeySeed,
      canonicalPayload: canonicalPayload,
    );

    final signatureB64 = base64.encode(signatureBytes);

    final headers = {
      'Content-Type': 'application/json',
      'X-Zoop-Identity': endpointId,
      'X-Zoop-Signature': signatureB64,
      'X-Zoop-Timestamp': timestampIso,
      'X-Zoop-Nonce': nonce,
    };

    http.Response response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await _client.get(uri, headers: headers);
        break;
      case 'POST':
        response = await _client.post(uri, headers: headers, body: bodyJsonStr);
        break;
      case 'PUT':
        response = await _client.put(uri, headers: headers, body: bodyJsonStr);
        break;
      case 'DELETE':
        response = await _client.delete(uri, headers: headers, body: bodyJsonStr.isNotEmpty ? bodyJsonStr : null);
        break;
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return json.decode(response.body);
    } else {
      _throwError(response);
    }
  }

  /// Fetches registered device details from the cloud.
  Future<Map<String, dynamic>> getDevice({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/devices/$endpointId',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists accessible peer devices in the network mesh.
  Future<List<PeerDevice>> listDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/devices',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );

    if (result is List) {
      return result
          .map((item) => PeerDevice.fromJson(item as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Fetches endpoint candidates and keys for a target peer device.
  Future<Map<String, dynamic>> getDeviceEndpoints({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/devices/$targetDeviceId/endpoints',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Creates a registered connection session with the cloud control plane.
  Future<Map<String, dynamic>> createConnection({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/connections',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'requester_device_id': endpointId,
        'target_device_id': targetDeviceId,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists active shares for this device.
  Future<Map<String, dynamic>> listShares({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/shares',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  Never _throwError(http.Response response) {
    try {
      final body = json.decode(response.body) as Map<String, dynamic>;
      final err = body['error'] as Map<String, dynamic>?;
      if (err != null) {
        throw CloudApiException(
          code: err['code'] as String? ?? 'unknown_error',
          message: err['message'] as String? ?? 'An error occurred',
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      if (e is CloudApiException) rethrow;
    }

    throw CloudApiException(
      code: 'http_${response.statusCode}',
      message: response.body.isNotEmpty ? response.body : 'HTTP ${response.statusCode}',
      statusCode: response.statusCode,
    );
  }
}
