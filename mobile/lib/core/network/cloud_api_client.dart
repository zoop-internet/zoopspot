import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../crypto/crypto_service.dart';
import '../models/peer_device.dart';
import 'i_cloud_api_client.dart';

export 'i_cloud_api_client.dart';

class CloudApiClient implements ICloudApiClient {
  @override
  final String baseUrl;
  final http.Client _client;
  final CryptoService _cryptoService;
  final Uuid _uuid = const Uuid();
  final Duration requestTimeout;
  final int maxRetries;

  CloudApiClient({
    String? baseUrl,
    http.Client? client,
    CryptoService? cryptoService,
    this.requestTimeout = const Duration(seconds: 15),
    this.maxRetries = 3,
  })  : baseUrl = (baseUrl != null && baseUrl.isNotEmpty)
            ? baseUrl
            : 'http://10.250.0.12:8080',
        _client = client ?? http.Client(),
        _cryptoService = cryptoService ?? CryptoService();

  /// Checks if the cloud control plane is healthy and reachable.
  @override
  Future<bool> checkHealth() async {
    try {
      final uri = Uri.parse('$baseUrl/v1/health');
      final response =
          await _client.get(uri).timeout(requestTimeout);
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
  @override
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

    final response = await _client
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: json.encode(payload),
        )
        .timeout(requestTimeout);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = json.decode(response.body) as Map<String, dynamic>;
      return DeviceRegistrationResponse.fromJson(data);
    } else {
      _throwError(response);
    }
  }

  /// Performs an authenticated HTTP request using the zoop-auth-v2 cryptographic protocol.
  /// Idempotent GET requests are automatically retried with exponential backoff on transient network failures.
  @override
  Future<dynamic> authenticatedRequest({
    required String method,
    required String path,
    required String endpointId,
    required List<int> privateKeySeed,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final isIdempotent = method.toUpperCase() == 'GET';
    final totalAttempts = isIdempotent ? maxRetries : 1;
    http.Response? response;
    dynamic lastError;

    for (int attempt = 0; attempt < totalAttempts; attempt++) {
      final timestampIso = DateTime.now().toUtc().toIso8601String();
      final nonce = _uuid.v4();
      final bodyJsonStr = body != null ? json.encode(body) : '';

      final canonicalPayload = _cryptoService.buildCanonicalPayload(
        method: method,
        path: uri.path,
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

      try {
        switch (method.toUpperCase()) {
          case 'GET':
            response = await _client
                .get(uri, headers: headers)
                .timeout(requestTimeout);
            break;
          case 'POST':
            response = await _client
                .post(uri, headers: headers, body: bodyJsonStr)
                .timeout(requestTimeout);
            break;
          case 'PUT':
            response = await _client
                .put(uri, headers: headers, body: bodyJsonStr)
                .timeout(requestTimeout);
            break;
          case 'DELETE':
            response = await _client
                .delete(
                  uri,
                  headers: headers,
                  body: bodyJsonStr.isNotEmpty ? bodyJsonStr : null,
                )
                .timeout(requestTimeout);
            break;
          default:
            throw ArgumentError('Unsupported HTTP method: $method');
        }

        // Retry transient server gateway errors on idempotent requests
        if (isIdempotent &&
            (response.statusCode == 502 ||
                response.statusCode == 503 ||
                response.statusCode == 504)) {
          if (attempt < totalAttempts - 1) {
            await Future.delayed(
              Duration(milliseconds: 300 * math.pow(2, attempt).round()),
            );
            continue;
          }
        }
        break;
      } catch (e) {
        lastError = e;
        if (isIdempotent && attempt < totalAttempts - 1) {
          await Future.delayed(
            Duration(milliseconds: 300 * math.pow(2, attempt).round()),
          );
          continue;
        }
        rethrow;
      }
    }

    if (response == null) {
      if (lastError != null) throw lastError;
      throw CloudApiException(
        code: 'request_failed',
        message: 'Request failed to execute',
        statusCode: 0,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return json.decode(response.body);
    } else {
      _throwError(response);
    }
  }

  /// Fetches registered device details from the cloud.
  @override
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
  @override
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
  @override
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
  @override
  Future<Map<String, dynamic>> createConnection({
    required String endpointId,
    required String targetDeviceId,
    required List<int> privateKeySeed,
    String? wireguardPublicKey,
  }) async {
    final body = <String, dynamic>{
      'recipient_id': endpointId,
      'provider_id': targetDeviceId,
    };
    if (wireguardPublicKey != null && wireguardPublicKey.isNotEmpty) {
      body['wireguard_public_key'] = wireguardPublicKey;
    }

    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/connections',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: body,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists active shares for this device.
  @override
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

  /// Generates an ephemeral pairing token to pair another device to this identity.
  @override
  Future<Map<String, dynamic>> createPairingToken({
    required String endpointId,
    required List<int> privateKeySeed,
    int expiresInSeconds = 600,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/pairing/token',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'expires_in_seconds': expiresInSeconds,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Claims a pairing token to mutually link with the issuing device.
  @override
  Future<Map<String, dynamic>> claimPairingToken({
    required String endpointId,
    required String code,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/pairing/claim',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'code': code,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists all paired devices in the user's personal mesh fleet.
  @override
  Future<List<Map<String, dynamic>>> getFleetDevices({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/devices/$endpointId/fleet',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    if (result is List) {
      return result.map((item) => item as Map<String, dynamic>).toList();
    }
    return [];
  }

  @override
  Future<Map<String, dynamic>> submitDiagnosticReport(Map<String, dynamic> report) async {
    final uri = Uri.parse('$baseUrl/v1/diagnostics/report');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: json.encode(report),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body) as Map<String, dynamic>;
    } else {
      _throwError(response);
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getDiagnosticReports(String deviceId) async {
    final uri = Uri.parse('$baseUrl/v1/diagnostics/report/$deviceId');
    final response = await _client.get(uri);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final res = json.decode(response.body);
      if (res is List) {
        return res.map((item) => item as Map<String, dynamic>).toList();
      }
      return [];
    } else {
      _throwError(response);
    }
  }

  /// Fetches the user/device authoritative wallet ledger from the cloud.
  @override
  Future<Map<String, dynamic>> getWallet({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/wallet',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Initiates a Mobile Money deposit via the cloud server.
  @override
  Future<Map<String, dynamic>> depositMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/wallet/deposit/mobile-money',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'amount': amount,
        'phone_number': phoneNumber,
        'provider': provider,
        'description': description,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Initiates a Card deposit via the cloud server.
  @override
  Future<Map<String, dynamic>> depositCard({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    String? callbackUrl,
    String? description,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/wallet/deposit/card',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'amount': amount,
        'callback_url': callbackUrl,
        'description': description,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Initiates a Mobile Money withdrawal via the cloud server.
  @override
  Future<Map<String, dynamic>> withdrawMobileMoney({
    required String endpointId,
    required List<int> privateKeySeed,
    required double amount,
    required String phoneNumber,
    required String provider,
    String? description,
  }) async {
    final result = await authenticatedRequest(
      method: 'POST',
      path: '/v1/wallet/withdraw',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
      body: {
        'amount': amount,
        'phone_number': phoneNumber,
        'provider': provider,
        'description': description,
      },
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists wallet transactions from the cloud server.
  @override
  Future<Map<String, dynamic>> listWalletTransactions({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/wallet/transactions?limit=$limit&offset=$offset',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Lists wallet earnings from the cloud server.
  @override
  Future<Map<String, dynamic>> listWalletEarnings({
    required String endpointId,
    required List<int> privateKeySeed,
    int limit = 20,
    int offset = 0,
  }) async {
    final result = await authenticatedRequest(
      method: 'GET',
      path: '/v1/wallet/earnings?limit=$limit&offset=$offset',
      endpointId: endpointId,
      privateKeySeed: privateKeySeed,
    );
    return result is Map<String, dynamic> ? result : {};
  }

  /// Queries payment transaction status for asynchronous confirmation (e.g. Mobile Money USSD / Card).
  @override
  Future<Map<String, dynamic>> checkTransactionStatus({
    required String endpointId,
    required List<int> privateKeySeed,
    required String referenceId,
  }) async {
    try {
      final result = await authenticatedRequest(
        method: 'GET',
        path: '/v1/wallet/transactions/$referenceId/status',
        endpointId: endpointId,
        privateKeySeed: privateKeySeed,
      );
      if (result is Map<String, dynamic>) {
        return result;
      }
    } catch (_) {
      // Fall back to listing transactions if dedicated status endpoint is not reachable
      final txList = await listWalletTransactions(
        endpointId: endpointId,
        privateKeySeed: privateKeySeed,
        limit: 10,
      );
      final rawList = txList['transactions'];
      if (rawList is List) {
        final matched = rawList.firstWhere(
          (t) =>
              (t is Map) &&
              (t['reference_id'] == referenceId || t['id'] == referenceId),
          orElse: () => null,
        );
        if (matched is Map<String, dynamic>) {
          return matched;
        }
      }
    }
    return {'status': 'pending', 'reference': referenceId};
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
