package network.zoop.app.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.util.Log
import network.zoop.app.MainActivity

/**
 * Interface definition matching the Go mobile bridge callback.
 */
interface ZoopStateCallback {
    fun onStateChange(state: String, endpoint: String, isDirect: Boolean)
    fun onError(errorCode: String, message: String)
}

/**
 * JNI / gomobile wrapper calling into libzoop.so
 */
object ZoopMobileBridge {
    init {
        try {
            System.loadLibrary("zoop")
            Log.i("ZoopMobileBridge", "libzoop.so loaded successfully")
        } catch (e: UnsatisfiedLinkError) {
            Log.w("ZoopMobileBridge", "Native library libzoop.so not found in standard path (development mode)")
        }
    }

    external fun initMobile(configJson: String, callback: ZoopStateCallback): Int
    external fun startTunnel(fd: Int, ifName: String): Int
    external fun connectPeer(peerPubKeyHex: String, candidatesJson: String, relayUrl: String): Int
    external fun notifyNetworkChange(networkType: String)
    external fun setPowerSavingMode(enabled: Boolean)
    external fun getConnectionStatus(): String
    external fun disconnect()
}

class ZoopVpnService : VpnService(), ZoopStateCallback {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var networkMonitor: NetworkMonitor? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isScreenReceiverRegistered = false

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.i(TAG, "Screen off: engaging low-power battery-saving mode")
                    try {
                        ZoopMobileBridge.setPowerSavingMode(true)
                    } catch (e: UnsatisfiedLinkError) {
                        Log.w(TAG, "Native power saving mode bypassed")
                    }
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.i(TAG, "Screen on: restoring active performance mode")
                    try {
                        ZoopMobileBridge.setPowerSavingMode(false)
                    } catch (e: UnsatisfiedLinkError) {
                        Log.w(TAG, "Native power saving mode bypassed")
                    }
                }
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Zoop VPN Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active Zoop Mesh connection status"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(statusText: String, isConnected: Boolean): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val disconnectIntent = Intent(this, ZoopVpnService::class.java).apply {
            action = ACTION_DISCONNECT
        }
        val disconnectPendingIntent = PendingIntent.getService(
            this,
            1,
            disconnectIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        builder
            .setContentTitle("Zoop Mesh Network")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.stat_sys_upload_done)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)

        if (isConnected) {
            val action = Notification.Action.Builder(
                null,
                "Disconnect",
                disconnectPendingIntent
            ).build()
            builder.addAction(action)
        }

        return builder.build()
    }

    private fun updateNotification(statusText: String, isConnected: Boolean) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, buildNotification(statusText, isConnected))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "Starting ZoopVpnService OS background service")

        val action = intent?.action
        if (action == ACTION_DISCONNECT) {
            stopVpn()
            return START_NOT_STICKY
        }

        startVpn(intent)
        return START_STICKY
    }

    private fun startVpn(intent: Intent?) {
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Connecting to Zoop Mesh...", false))

        try {
            val routingMode = intent?.getStringExtra(EXTRA_ROUTING_MODE) ?: "full"
            val killSwitch = intent?.getBooleanExtra(EXTRA_KILL_SWITCH, false) ?: false
            Log.i(TAG, "Configuring VPN with routing mode: $routingMode, killSwitch: $killSwitch")

            val builder = Builder()
                .setSession("ZoopVPN")
                .addAddress("100.64.0.2", 32)
                .setMtu(1420)
                .setBlocking(true)

            if (routingMode == "full") {
                // Full Internet Egress: Route all IPv4 & IPv6 traffic through Zoop exit node
                builder.addRoute("0.0.0.0", 0)
                // IPv6 Leak Protection: Assign ULA IPv6 address and sinkhole all IPv6 traffic into the tunnel
                builder.addAddress("fd00:7a6f:6f70::2", 128)
                builder.addRoute("::", 0)

                // High-performance privacy DNS resolvers
                builder.addDnsServer("1.1.1.1")
                builder.addDnsServer("1.0.0.1")
                builder.addDnsServer("2606:4700:4700::1111")
            } else {
                // Split Tunnel: Route only Zoop mesh overlay
                builder.addRoute("100.64.0.0", 10)
                builder.addAddress("fd00:7a6f:6f70::2", 128)
                builder.addRoute("fd00:7a6f:6f70::", 64)
                builder.addDnsServer("100.64.0.1")
            }

            // Register screen state receiver for adaptive power saving
            if (!isScreenReceiverRegistered) {
                val filter = IntentFilter().apply {
                    addAction(Intent.ACTION_SCREEN_OFF)
                    addAction(Intent.ACTION_SCREEN_ON)
                }
                registerReceiver(screenReceiver, filter)
                isScreenReceiverRegistered = true
            }

            vpnInterface = builder.establish()
            val fd = vpnInterface?.fd ?: -1

            if (fd < 0) {
                Log.e(TAG, "Failed to obtain valid VpnService FD")
                emitError("TUN_FD_ERROR", "Failed to obtain valid VpnService file descriptor")
                stopVpn()
                return
            }

            isRunning = true
            Log.i(TAG, "VpnService established natively with FD=$fd")
            emitState("connected", "100.64.0.2", true)
            updateNotification("Connected to Zoop Mesh (Direct P2P)", true)

            // Initialize Go mobile runtime with this service as event listener
            try {
                ZoopMobileBridge.initMobile(
                    """{"device_id":"android-device","cloud_url":"http://localhost:8080"}""",
                    this
                )
                ZoopMobileBridge.startTunnel(fd, "zoop0")

                val peerPubKey = intent?.getStringExtra(EXTRA_PEER_KEY)
                val candidatesJson = intent?.getStringExtra(EXTRA_CANDIDATES) ?: "[]"
                val relayUrl = intent?.getStringExtra(EXTRA_RELAY_URL) ?: ""

                if (!peerPubKey.isNullOrEmpty()) {
                    ZoopMobileBridge.connectPeer(peerPubKey, candidatesJson, relayUrl)
                }
            } catch (e: UnsatisfiedLinkError) {
                Log.w(TAG, "Native bridge call bypassed (development test mode)")
            }

            // Register ConnectivityManager network callbacks for instant roaming
            networkMonitor = NetworkMonitor(this) { networkType ->
                Log.i(TAG, "Network changed to: $networkType")
                emitState("roaming", networkType, true)
                try {
                    ZoopMobileBridge.notifyNetworkChange(networkType)
                } catch (e: UnsatisfiedLinkError) {
                    Log.w(TAG, "Native roaming notification bypassed")
                }
            }
            networkMonitor?.start()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VpnService", e)
            emitError("VPN_ESTABLISH_ERROR", e.message ?: "Unknown error")
            stopVpn()
        }
    }

    private fun stopVpn() {
        Log.i(TAG, "Stopping ZoopVpnService")
        isRunning = false
        emitState("disconnected", "", false)

        try {
            ZoopMobileBridge.disconnect()
        } catch (e: UnsatisfiedLinkError) {
            Log.w(TAG, "Native disconnect bypassed")
        }

        networkMonitor?.stop()
        if (isScreenReceiverRegistered) {
            try {
                unregisterReceiver(screenReceiver)
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering screen receiver: ${e.message}")
            }
            isScreenReceiverRegistered = false
        }
        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing VPN interface: ${e.message}")
        }
        vpnInterface = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(NOTIFICATION_ID)

        stopSelf()
    }

    override fun onStateChange(state: String, endpoint: String, isDirect: Boolean) {
        Log.i(TAG, "State changed: state=$state endpoint=$endpoint isDirect=$isDirect")
        emitState(state, endpoint, isDirect)
        when (state) {
            "connected" -> updateNotification(if (isDirect) "Connected (Direct P2P)" else "Connected (Encrypted Relay)", true)
            "roaming" -> updateNotification("Roaming: $endpoint", true)
            "connecting" -> updateNotification("Punching NAT...", false)
            "paused" -> updateNotification("Connection Paused", true)
        }
    }

    override fun onError(errorCode: String, message: String) {
        Log.e(TAG, "Zoop error: code=$errorCode message=$message")
        emitError(errorCode, message)
    }

    private fun emitState(state: String, endpoint: String, isDirect: Boolean) {
        mainHandler.post {
            eventListener?.invoke(
                mapOf(
                    "type" to "state_change",
                    "state" to state,
                    "endpoint" to endpoint,
                    "isDirect" to isDirect
                )
            )
        }
    }

    private fun emitError(errorCode: String, message: String) {
        mainHandler.post {
            eventListener?.invoke(
                mapOf(
                    "type" to "error",
                    "errorCode" to errorCode,
                    "message" to message
                )
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopVpn()
    }

    companion object {
        private const val TAG = "ZoopVpnService"
        private const val NOTIFICATION_ID = 0x2009
        private const val CHANNEL_ID = "zoop_vpn_channel"
        const val ACTION_CONNECT = "com.zoop.vpn.CONNECT"
        const val ACTION_DISCONNECT = "com.zoop.vpn.DISCONNECT"
        const val EXTRA_PEER_KEY = "com.zoop.vpn.PEER_KEY"
        const val EXTRA_CANDIDATES = "com.zoop.vpn.CANDIDATES"
        const val EXTRA_RELAY_URL = "com.zoop.vpn.RELAY_URL"
        const val EXTRA_ROUTING_MODE = "com.zoop.vpn.ROUTING_MODE"
        const val EXTRA_KILL_SWITCH = "com.zoop.vpn.KILL_SWITCH"

        var isRunning: Boolean = false
        var eventListener: ((Map<String, Any>) -> Unit)? = null
    }
}
