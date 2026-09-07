package network.zoop.app

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import network.zoop.app.vpn.ZoopVpnService

class MainActivity : FlutterActivity() {

    private val VPN_CHANNEL = "network.zoop.app/vpn"
    private val EVENTS_CHANNEL = "network.zoop.app/vpn_events"
    private val VPN_REQUEST_CODE = 0x2009

    private var pendingVpnResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Command Channel (Flutter -> Native)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VPN_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "prepareVpn" -> {
                    val intent = VpnService.prepare(this)
                    if (intent != null) {
                        pendingVpnResult = result
                        startActivityForResult(intent, VPN_REQUEST_CODE)
                    } else {
                        // Already prepared and authorized by user
                        result.success(true)
                    }
                }
                "startTunnel" -> {
                    val peerKey = call.argument<String>("peerKey")
                    val candidates = call.argument<String>("candidates")
                    val relayUrl = call.argument<String>("relayUrl")

                    val intent = Intent(this, ZoopVpnService::class.java).apply {
                        action = ZoopVpnService.ACTION_CONNECT
                        putExtra(ZoopVpnService.EXTRA_PEER_KEY, peerKey)
                        putExtra(ZoopVpnService.EXTRA_CANDIDATES, candidates)
                        putExtra(ZoopVpnService.EXTRA_RELAY_URL, relayUrl)
                    }
                    startService(intent)
                    result.success(true)
                }
                "stopTunnel" -> {
                    val intent = Intent(this, ZoopVpnService::class.java).apply {
                        action = ZoopVpnService.ACTION_DISCONNECT
                    }
                    startService(intent)
                    result.success(true)
                }
                "getStatus" -> {
                    result.success(ZoopVpnService.isRunning)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }

        // Event Channel (Native -> Flutter telemetry)
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENTS_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    ZoopVpnService.eventListener = { eventMap ->
                        runOnUiThread {
                            events?.success(eventMap)
                        }
                    }
                }

                override fun onCancel(arguments: Any?) {
                    ZoopVpnService.eventListener = null
                }
            }
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_REQUEST_CODE) {
            val authorized = resultCode == Activity.RESULT_OK
            pendingVpnResult?.success(authorized)
            pendingVpnResult = null
        }
    }
}
