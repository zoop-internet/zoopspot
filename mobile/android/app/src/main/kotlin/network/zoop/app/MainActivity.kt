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
    private val BIOMETRIC_CHANNEL = "network.zoop.app/biometrics"
    private val VPN_REQUEST_CODE = 0x2009
    private val BIOMETRIC_REQUEST_CODE = 0x2010

    private var pendingVpnResult: MethodChannel.Result? = null
    private var pendingAuthResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Biometric / Device Security Channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, BIOMETRIC_CHANNEL).setMethodCallHandler { call, result ->
            val keyguardManager = getSystemService(android.content.Context.KEYGUARD_SERVICE) as? android.app.KeyguardManager
            when (call.method) {
                "canAuthenticate" -> {
                    result.success(keyguardManager?.isDeviceSecure ?: false)
                }
                "authenticate" -> {
                    if (keyguardManager == null || !keyguardManager.isDeviceSecure) {
                        // Device has no screen lock/biometrics configured; permit access
                        result.success(true)
                        return@setMethodCallHandler
                    }
                    val title = call.argument<String>("title") ?: "Zoop Key Security"
                    val desc = call.argument<String>("description") ?: "Authenticate to access your private recovery phrase"
                    val intent = keyguardManager.createConfirmDeviceCredentialIntent(title, desc)
                    if (intent != null) {
                        pendingAuthResult = result
                        startActivityForResult(intent, BIOMETRIC_REQUEST_CODE)
                    } else {
                        result.success(true)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }

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
                    val routingMode = call.argument<String>("routingMode") ?: "full"
                    val privateKey = call.argument<String>("privateKey") ?: ""
                    val clientIp = call.argument<String>("clientIp") ?: "100.64.0.2"

                    val intent = Intent(this, ZoopVpnService::class.java).apply {
                        action = ZoopVpnService.ACTION_CONNECT
                        putExtra(ZoopVpnService.EXTRA_PEER_KEY, peerKey)
                        putExtra(ZoopVpnService.EXTRA_WG_PRIV_KEY, privateKey)
                        putExtra(ZoopVpnService.EXTRA_CANDIDATES, candidates)
                        putExtra(ZoopVpnService.EXTRA_RELAY_URL, relayUrl)
                        putExtra(ZoopVpnService.EXTRA_ROUTING_MODE, routingMode)
                        putExtra(ZoopVpnService.EXTRA_CLIENT_IP, clientIp)
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
                "getBatteryLevel" -> {
                    val batteryManager = getSystemService(android.content.Context.BATTERY_SERVICE) as? android.os.BatteryManager
                    val level = batteryManager?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
                    result.success(level)
                }
                "isMeteredNetwork" -> {
                    val cm = getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
                    val isMetered = cm?.isActiveNetworkMetered ?: false
                    result.success(isMetered)
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
                    ZoopVpnService.lastEmittedEvent?.let { lastEvent ->
                        runOnUiThread {
                            events?.success(lastEvent)
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
        } else if (requestCode == BIOMETRIC_REQUEST_CODE) {
            val authorized = resultCode == Activity.RESULT_OK
            pendingAuthResult?.success(authorized)
            pendingAuthResult = null
        }
    }
}
