import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zoop_mobile/core/crypto/crypto_service.dart';
import 'package:zoop_mobile/core/network/cloud_api_client.dart';
import 'package:zoop_mobile/features/diagnostics/application/diagnostics_notifier.dart';

void main() {
  late CryptoService cryptoService;

  setUp(() {
    cryptoService = CryptoService();
  });

  test('Initial state is not running and report is null', () {
    final mockHttp = MockClient((req) async => http.Response('{}', 200));
    final apiClient = CloudApiClient(
      baseUrl: 'https://test.zoop.network',
      client: mockHttp,
      cryptoService: cryptoService,
    );
    final notifier = DiagnosticsNotifier(client: apiClient);

    expect(notifier.state.isRunning, isFalse);
    expect(notifier.state.report, isNull);
    expect(notifier.state.error, isNull);
  });

  test('runDiagnostics produces a full report with 9 checks', () async {
    final mockHttp = MockClient((request) async {
      if (request.url.path == '/v1/health') {
        return http.Response(json.encode({'status': 'ok'}), 200);
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = CloudApiClient(
      baseUrl: 'https://test.zoop.network',
      client: mockHttp,
      cryptoService: cryptoService,
    );
    final notifier = DiagnosticsNotifier(client: apiClient);

    final future = notifier.runDiagnostics();
    expect(notifier.state.isRunning, isTrue);

    await future;

    expect(notifier.state.isRunning, isFalse);
    expect(notifier.state.report, isNotNull);

    final report = notifier.state.report!;
    expect(report.healthy, isTrue);
    expect(report.checks.length, equals(9));

    final checkNames = report.checks.map((c) => c.name).toList();
    expect(checkNames, containsAll([
      'Agent State',
      'TUN Interface',
      'Control Plane',
      'DNS Resolution',
      'STUN/NAT',
      'NAT Type Classification',
      'Path MTU',
      'DNS Leak',
      'Latency/Throughput'
    ]));
  });

  test('generateShareableBundle returns valid JSON without errors', () async {
    final mockHttp = MockClient((request) async {
      return http.Response(json.encode({'status': 'ok'}), 200);
    });

    final apiClient = CloudApiClient(
      baseUrl: 'https://test.zoop.network',
      client: mockHttp,
      cryptoService: cryptoService,
    );
    final notifier = DiagnosticsNotifier(client: apiClient);
    await notifier.runDiagnostics();

    final bundle = notifier.generateShareableBundle();
    expect(bundle, isNotEmpty);

    final decoded = json.decode(bundle);
    expect(decoded, isA<Map<String, dynamic>>());
    expect(decoded['healthy'], isTrue);
    expect(decoded['checks'], isA<List>());
  });

  test('submitToCloud calls API and returns true on success', () async {
    bool submitted = false;
    final mockHttp = MockClient((request) async {
      if (request.url.path == '/v1/health') {
        return http.Response(json.encode({'status': 'ok'}), 200);
      }
      if (request.url.path == '/v1/diagnostics/report' && request.method == 'POST') {
        submitted = true;
        return http.Response(
          json.encode({
            'report_id': 'rep-12345',
            'device_id': 'dev-12345',
            'status': 'recorded',
          }),
          201,
          headers: {'Content-Type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    final apiClient = CloudApiClient(
      baseUrl: 'https://test.zoop.network',
      client: mockHttp,
      cryptoService: cryptoService,
    );
    final notifier = DiagnosticsNotifier(client: apiClient);

    await notifier.runDiagnostics();
    final result = await notifier.submitToCloud();

    expect(result, isTrue);
    expect(submitted, isTrue);
  });
}
