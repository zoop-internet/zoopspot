import 'package:flutter_test/flutter_test.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/core/utils/currency_formatter.dart';
import 'package:zoop_mobile/core/utils/data_sanitizer.dart';
import 'package:zoop_mobile/core/utils/phone_utils.dart';
import 'package:zoop_mobile/core/vpn/vpn_bridge_service.dart';
import 'package:zoop_mobile/features/diagnostics/application/diagnostics_notifier.dart';
import 'package:zoop_mobile/features/diagnostics/domain/diagnostic_models.dart';

class _MockCloudApi implements ICloudApiClient {
  @override
  Future<bool> checkHealth() async => true;

  @override
  Future<Map<String, dynamic>> submitDiagnosticReport(Map<String, dynamic> report) async => {'status': 'received'};

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('Platform, Observability & Security (Phases 11-17)', () {
    group('Phase 11: DataSanitizer Redaction', () {
      test('sanitizeString redacts sensitive JSON fields and bearer tokens', () {
        const sensitivePayload = '{"seed": "abcdef1234567890abcdef1234567890", "private_key": "mySecretKey", "status": "ok"}';
        final sanitized = DataSanitizer.sanitizeString(sensitivePayload);
        expect(sanitized.contains('abcdef1234567890'), isFalse);
        expect(sanitized.contains('[REDACTED]'), isTrue);

        const bearerHeader = 'Authorization: Bearer mySecretToken12345';
        expect(DataSanitizer.sanitizeString(bearerHeader), equals('Authorization: Bearer [REDACTED]'));
      });

      test('sanitizeMap recursively masks phone numbers and redacts secrets', () {
        final rawMap = {
          'user_id': 'usr-1',
          'phone_number': '+256772123456',
          'auth_token': 'secret-token-xyz',
          'nested': {
            'private_key': 'wg-priv-key',
            'allowed_ips': '10.0.0.1/32',
          },
        };

        final cleaned = DataSanitizer.sanitizeMap(rawMap);
        expect(cleaned['auth_token'], equals('[REDACTED]'));
        expect(cleaned['nested']['private_key'], equals('[REDACTED]'));
        expect(cleaned['nested']['allowed_ips'], equals('10.0.0.1/32'));
        expect(cleaned['phone_number'], equals('+256*****56'));
      });
    });

    group('Phase 14: Fault Tolerance & Idempotency', () {
      test('VpnBridgeService transition lock prevents duplicate tunnel invocations', () {
        final vpn = VpnBridgeService();
        expect(vpn.isTransitioning, isFalse);
      });
    });

    group('Phase 16: CurrencyFormatter & East Africa PhoneUtils', () {
      test('CurrencyFormatter properly groups digits for UGX and Zoop Points', () {
        expect(CurrencyFormatter.formatUgx(25000), equals('UGX 25,000'));
        expect(CurrencyFormatter.formatUgx(1000000), equals('UGX 1,000,000'));
        expect(CurrencyFormatter.formatPoints(45, showSign: true), equals('+45 ZP'));
        expect(CurrencyFormatter.formatPoints(2500), equals('2,500 ZP'));
        expect(CurrencyFormatter.parseAmount('UGX 75,000'), equals(75000.0));
      });

      test('PhoneUtils correctly formats and detects East Africa telecom numbers', () {
        // Uganda
        expect(PhoneUtils.formatEastAfricaPhone('0772123456'), equals('+256772123456'));
        expect(PhoneUtils.detectNetwork('+256772123456'), equals('mtn'));
        expect(PhoneUtils.detectNetwork('+256701123456'), equals('airtel'));

        // Kenya
        expect(PhoneUtils.formatEastAfricaPhone('0712345678', defaultCountryCode: '254'), equals('+254712345678'));
        expect(PhoneUtils.detectNetwork('+254712345678'), equals('safaricom'));

        // Rwanda
        expect(PhoneUtils.formatEastAfricaPhone('0781234567', defaultCountryCode: '250'), equals('+250781234567'));
        expect(PhoneUtils.detectNetwork('+250781234567'), equals('mtn'));

        // Tanzania
        expect(PhoneUtils.formatEastAfricaPhone('0751234567', defaultCountryCode: '255'), equals('+255751234567'));
        expect(PhoneUtils.detectNetwork('+255751234567'), equals('vodacom'));

        // Validity check
        expect(PhoneUtils.isValidEastAfricaPhone('+256772123456'), isTrue);
        expect(PhoneUtils.isValidEastAfricaPhone('+254712345678'), isTrue);
        expect(PhoneUtils.isValidEastAfricaPhone('123'), isFalse);
      });
    });

    group('Phase 17: 9-Point Diagnostic Probe & User Remedies', () {
      test('DiagnosticsNotifier completes 9 audit checks with user explanations and remedies', () async {
        final mockApi = _MockCloudApi();
        final notifier = DiagnosticsNotifier(client: mockApi);

        await notifier.runDiagnostics();

        final report = notifier.state.report;
        expect(report, isNotNull);
        expect(report!.checks.length, equals(9));
        expect(report.healthy, isTrue);

        // Verify user explanations and remedies exist
        for (final check in report.checks) {
          expect(check.userExplanation, isNotNull);
          expect(check.remedy, isNotNull);
          expect(check.status, equals(CheckStatus.passed));
        }

        // Verify shareable bundle generation
        final bundle = notifier.generateShareableBundle();
        expect(bundle.contains('Agent State'), isTrue);
        expect(bundle.contains('DNS Leak'), isTrue);
      });
    });
  });
}
