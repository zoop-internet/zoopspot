import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:uuid/uuid.dart';
import '../crypto/crypto_service.dart';

enum SignalingConnectionState { disconnected, connecting, connected }

class SignalingMessage {
  final String type;
  final String senderId;
  final String recipientId;
  final Map<String, dynamic>? payload;

  SignalingMessage({
    required this.type,
    required this.senderId,
    required this.recipientId,
    this.payload,
  });

  factory SignalingMessage.fromJson(Map<String, dynamic> json) {
    return SignalingMessage(
      type: json['type'] as String? ?? '',
      senderId: json['sender_id'] as String? ?? '',
      recipientId: json['recipient_id'] as String? ?? '',
      payload: json['payload'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'sender_id': senderId,
      'recipient_id': recipientId,
      if (payload != null) 'payload': payload,
    };
  }
}

class SignalingClient {
  final String wsBaseUrl;
  final CryptoService _cryptoService;
  final Uuid _uuid = const Uuid();

  WebSocket? _socket;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  bool _isDisposed = false;

  final _messageController = StreamController<SignalingMessage>.broadcast();
  final _connectionStateController =
      StreamController<SignalingConnectionState>.broadcast();

  SignalingConnectionState _state = SignalingConnectionState.disconnected;

  SignalingClient({
    String? wsBaseUrl,
    CryptoService? cryptoService,
  })  : wsBaseUrl = wsBaseUrl ?? 'wss://3.70.135.200.sslip.io',
        _cryptoService = cryptoService ?? CryptoService();

  Stream<SignalingMessage> get messages => _messageController.stream;
  Stream<SignalingConnectionState> get connectionState =>
      _connectionStateController.stream;
  SignalingConnectionState get currentState => _state;

  void _setState(SignalingConnectionState state) {
    _state = state;
    if (!_connectionStateController.isClosed) {
      _connectionStateController.add(state);
    }
  }

  /// Establishes authenticated WebSocket signaling session with the Cloud Control Plane.
  Future<void> connect({
    required String endpointId,
    required List<int> privateKeySeed,
  }) async {
    if (_isDisposed) return;
    if (_state == SignalingConnectionState.connected ||
        _state == SignalingConnectionState.connecting) {
      return;
    }

    _setState(SignalingConnectionState.connecting);

    try {
      final wsUrl = '$wsBaseUrl/v1/signaling';
      final timestampIso = DateTime.now().toUtc().toIso8601String();
      final nonce = _uuid.v4();

      final canonicalPayload = _cryptoService.buildCanonicalPayload(
        method: 'GET',
        path: '/v1/signaling',
        timestampIso: timestampIso,
        nonce: nonce,
        body: '',
      );

      final sigBytes = await _cryptoService.signPayload(
        privateKeySeed: privateKeySeed,
        canonicalPayload: canonicalPayload,
      );

      final sigB64 = base64.encode(sigBytes);

      final headers = {
        'X-Zoop-Identity': endpointId,
        'X-Zoop-Signature': sigB64,
        'X-Zoop-Timestamp': timestampIso,
        'X-Zoop-Nonce': nonce,
      };

      _socket = await WebSocket.connect(wsUrl, headers: headers)
          .timeout(const Duration(seconds: 10));

      _setState(SignalingConnectionState.connected);
      _startHeartbeat();

      _socket!.listen(
        (data) {
          try {
            if (data is String) {
              final jsonMap = json.decode(data) as Map<String, dynamic>;
              final msg = SignalingMessage.fromJson(jsonMap);
              if (!_messageController.isClosed) {
                _messageController.add(msg);
              }
            }
          } catch (_) {
            // Ignore malformed payloads
          }
        },
        onError: (err) {
          _handleDisconnect(endpointId, privateKeySeed);
        },
        onDone: () {
          _handleDisconnect(endpointId, privateKeySeed);
        },
      );
    } catch (_) {
      _handleDisconnect(endpointId, privateKeySeed);
    }
  }

  /// Sends a signaling message to a remote peer via the Cloud Signaling Hub.
  bool sendMessage(SignalingMessage message) {
    if (_socket != null && _state == SignalingConnectionState.connected) {
      _socket!.add(json.encode(message.toJson()));
      return true;
    }
    return false;
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 25), (timer) {
      if (_socket != null && _state == SignalingConnectionState.connected) {
        _socket!.pingInterval = const Duration(seconds: 10);
      }
    });
  }

  void _handleDisconnect(String endpointId, List<int> privateKeySeed) {
    _heartbeatTimer?.cancel();
    _socket?.close();
    _socket = null;
    _setState(SignalingConnectionState.disconnected);

    if (!_isDisposed) {
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 5), () {
        connect(endpointId: endpointId, privateKeySeed: privateKeySeed);
      });
    }
  }

  void disconnect() {
    _isDisposed = true;
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _socket?.close();
    _socket = null;
    _setState(SignalingConnectionState.disconnected);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionStateController.close();
  }
}
