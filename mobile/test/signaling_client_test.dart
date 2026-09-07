import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/network/signaling_client.dart';

void main() {
  group('SignalingMessage Tests', () {
    test('SignalingMessage serialization and deserialization', () {
      final msg = SignalingMessage(
        type: 'connection_request',
        senderId: '11111111-1111-1111-1111-111111111111',
        recipientId: '22222222-2222-2222-2222-222222222222',
        payload: {
          'connection_id': '33333333-3333-3333-3333-333333333333',
          'wireguard_public_key': 'wg-pub-key-b64',
          'candidates': [
            {'ip': '192.168.1.50', 'port': 51820, 'type': 'host', 'priority': 100},
          ],
        },
      );

      final jsonMap = msg.toJson();
      expect(jsonMap['type'], 'connection_request');
      expect(jsonMap['sender_id'], '11111111-1111-1111-1111-111111111111');
      expect(jsonMap['recipient_id'], '22222222-2222-2222-2222-222222222222');
      expect(jsonMap['payload']['wireguard_public_key'], 'wg-pub-key-b64');

      final deserialized = SignalingMessage.fromJson(jsonMap);
      expect(deserialized.type, msg.type);
      expect(deserialized.senderId, msg.senderId);
      expect(deserialized.recipientId, msg.recipientId);
      expect(deserialized.payload!['connection_id'], '33333333-3333-3333-3333-333333333333');
    });

    test('SignalingClient instantiation and state defaults', () {
      final crypto = CryptoService();
      final client = SignalingClient(
        wsBaseUrl: 'wss://test.zoop.network',
        cryptoService: crypto,
      );

      expect(client.currentState, SignalingConnectionState.disconnected);
      client.dispose();
    });
  });
}
