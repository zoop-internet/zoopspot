package network.zoop.app.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
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
    fun onProtectSocket(fd: Int): Boolean
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
    external fun connectPeer(peerPubKeyHex: String, candidatesJson: String, relayUrl: String, localIp: String): Int
    external fun connectPeerZeroBalance(peerPubKeyHex: String, peerEndpointId: String, candidatesJson: String, relayUrl: String, carrierKey: String): Int
    external fun notifyNetworkChange(networkType: String)
    external fun setPowerSavingMode(enabled: Boolean)
    external fun getConnectionStatus(): String
    external fun getCandidatesJSON(localIp: String): String
    external fun disconnect()

    fun getActiveLocalIp(context: Context): String {
        try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
            if (cm != null) {
                // Check physical networks, avoiding VPN interface
                for (network in cm.allNetworks) {
                    val caps = cm.getNetworkCapabilities(network) ?: continue
                    if (caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN)) continue
                    val linkProps = cm.getLinkProperties(network) ?: continue
                    for (linkAddr in linkProps.linkAddresses) {
                        val addr = linkAddr.address
                        if (addr is java.net.Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                            val host = addr.hostAddress
                            if (!host.isNullOrEmpty() && !host.startsWith("127.") && !host.startsWith("100.64.")) {
                                return host
                            }
                        }
                    }
                }
            }
            // Fallback: standard NetworkInterface enumeration
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces != null && interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp || iface.name.contains("tun") || iface.name.contains("zoop")) continue
                val addrs = iface.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    if (addr is java.net.Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress) {
                        val host = addr.hostAddress
                        if (!host.isNullOrEmpty() && !host.startsWith("127.") && !host.startsWith("100.64.")) {
                            return host
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("ZoopMobileBridge", "Failed to resolve active local IP: ${e.message}")
        }
        return ""
    }
}

class ZoopVpnService : VpnService(), ZoopStateCallback {

    private val vpnExecutor = java.util.concurrent.Executors.newSingleThreadExecutor()
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
                "Zoop Internet Sharing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Internet sharing connection status"
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

        val iconRes = resources.getIdentifier("ic_notification", "drawable", packageName).let {
            if (it != 0) it else android.R.drawable.stat_notify_sync_noanim
        }

        builder
            .setContentTitle("Zoop")
            .setContentText(statusText)
            .setSmallIcon(iconRes)
            .setContentIntent(openPendingIntent)
            .setOngoing(true)
            .setColor(0xFF00D2FF.toInt())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setCategory(Notification.CATEGORY_SERVICE)
        }

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
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    buildNotification("Connecting to peers...", false),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                )
            } else {
                startForeground(NOTIFICATION_ID, buildNotification("Connecting to peers...", false))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
        }

        try {
            val zeroBalanceMode = intent?.getBooleanExtra(EXTRA_ZERO_BALANCE, true) ?: true
            val routingMode = intent?.getStringExtra(EXTRA_ROUTING_MODE) ?: "full"
            val killSwitch = intent?.getBooleanExtra(EXTRA_KILL_SWITCH, false) ?: false
            Log.i(TAG, "Configuring VPN with routing mode: $routingMode, killSwitch: $killSwitch, zeroBalance: $zeroBalanceMode")

            val clientIp = intent?.getStringExtra(EXTRA_CLIENT_IP)?.takeIf { it.isNotEmpty() } ?: "100.64.0.2"
            val builder = Builder()
                .setSession("ZoopVPN")
                .addAddress(clientIp, 24)
                .setMtu(1420)
                .setBlocking(true)

            // Internal overlay subnet and IPv6 mesh address/route for Zoop communication
            builder.addRoute("100.64.0.0", 10)
            builder.addAddress("fd00:7a6f:6f70::2", 128)
            builder.addRoute("fd00:7a6f:6f70::", 64)

            if (routingMode == "full" || zeroBalanceMode) {
                // Full Internet Egress: Route all IPv4 and IPv6 traffic through Zoop exit node
                builder.addRoute("0.0.0.0", 0)
                builder.addRoute("::", 0)

                // High-performance resilient DNS resolvers (Cloudflare, Google, Quad9)
                // Providing multiple IPv4 and IPv6 resolvers ensures Android Private DNS (DoT 853)
                // and standard DNS (UDP 53) resolve instantly without IPv6 cellular leaks.
                builder.addDnsServer("1.1.1.1")
                builder.addDnsServer("8.8.8.8")
                builder.addDnsServer("1.0.0.1")
                builder.addDnsServer("8.8.4.4")
                builder.addDnsServer("9.9.9.9")
                builder.addDnsServer("2606:4700:4700::1111")
                builder.addDnsServer("2001:4860:4860::8888")
            } else {
                builder.addDnsServer("1.1.1.1")
                builder.addDnsServer("8.8.8.8")
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
            Log.i(TAG, "VpnService established natively with FD=$fd (IP=$clientIp) zeroBalance=$zeroBalanceMode")
            emitState("connecting", clientIp, false)
            updateNotification("Connecting to peers...", false)

            // Initialize Go mobile runtime with this service as event listener on background executor
            vpnExecutor.execute {
                try {
                    val wgPrivKey = intent?.getStringExtra(EXTRA_WG_PRIV_KEY) ?: ""
                    val identityKey = intent?.getStringExtra(EXTRA_IDENTITY_KEY) ?: ""
                    val configJson = org.json.JSONObject().apply {
                        put("device_id", "android-device")
                        put("cloud_url", "https://3.70.135.200.sslip.io")
                        if (wgPrivKey.isNotEmpty()) {
                            put("wireguard_private_key", wgPrivKey)
                        }
                        if (identityKey.isNotEmpty()) {
                            put("identity_private_key", identityKey)
                        }
                    }.toString()

                    ZoopMobileBridge.initMobile(configJson, this)
                    ZoopMobileBridge.startTunnel(fd, "zoop0")

                    val peerPubKey = intent?.getStringExtra(EXTRA_PEER_KEY)
                    val candidatesJson = intent?.getStringExtra(EXTRA_CANDIDATES) ?: "[]"
                    val relayUrl = intent?.getStringExtra(EXTRA_RELAY_URL) ?: ""

                    if (!peerPubKey.isNullOrEmpty()) {
                        if (zeroBalanceMode) {
                            val peerEndpointId = intent?.getStringExtra(EXTRA_PEER_ENDPOINT_ID) ?: ""
                            val carrierKey = intent?.getStringExtra(EXTRA_CARRIER_KEY) ?: "mtn-ug"
                            Log.i(TAG, "ZoopVpnService: zero-balance mode, carrier=$carrierKey peerEndpoint=$peerEndpointId")
                            ZoopMobileBridge.connectPeerZeroBalance(peerPubKey, peerEndpointId, candidatesJson, relayUrl, carrierKey)
                        } else {
                            val localIp = ZoopMobileBridge.getActiveLocalIp(this)
                            Log.i(TAG, "ZoopVpnService: direct mode, localIp=$localIp")
                            ZoopMobileBridge.connectPeer(peerPubKey, candidatesJson, relayUrl, localIp)
                        }
                    } else {
                        Log.w(TAG, "ZoopVpnService: peerPubKey is null or empty, skipping connectPeer")
                    }
                } catch (e: UnsatisfiedLinkError) {
                    Log.w(TAG, "Native bridge call bypassed (development test mode)")
                } catch (e: Throwable) {
                    Log.e(TAG, "Failed in native tunnel background thread: ${e.message}", e)
                    emitError("TUNNEL_START_ERROR", e.message ?: "Tunnel failed to start")
                }
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

    override fun onProtectSocket(fd: Int): Boolean {
        val res = protect(fd)
        Log.i(TAG, "Protected WireGuard UDP socket fd=$fd result=$res")
        return res
    }

    override fun onStateChange(state: String, endpoint: String, isDirect: Boolean) {
        Log.i(TAG, "State changed: state=$state endpoint=$endpoint isDirect=$isDirect")
        val normalizedState = when (state) {
            "direct", "recovered", "connected" -> "connected"
            "relayed" -> "connected"
            "connecting" -> "connecting"
            "roaming", "degraded" -> "roaming"
            "paused" -> "paused"
            "disconnected" -> "disconnected"
            else -> state
        }
        val directMode = if (state == "relayed") false else isDirect
        emitState(normalizedState, endpoint, directMode)
        when (normalizedState) {
            "connected" -> updateNotification(if (directMode) "Internet Sharing Active (Direct P2P)" else "Internet Sharing Active (Relay)", true)
            "roaming" -> updateNotification("Internet Sharing Active: $endpoint", true)
            "connecting" -> updateNotification("Connecting to peers...", false)
            "paused" -> updateNotification("Internet Sharing Paused", true)
            "disconnected" -> updateNotification("Disconnected", false)
        }
    }

    override fun onError(errorCode: String, message: String) {
        Log.e(TAG, "Zoop error: code=$errorCode message=$message")
        emitError(errorCode, message)
    }

    private fun emitState(state: String, endpoint: String, isDirect: Boolean) {
        val eventMap = mapOf(
            "type" to "state_change",
            "state" to state,
            "endpoint" to endpoint,
            "isDirect" to isDirect
        )
        lastEmittedEvent = eventMap
        mainHandler.post {
            eventListener?.invoke(eventMap)
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
        private const val CHANNEL_ID = "zoop_sharing_channel"
        const val ACTION_CONNECT = "com.zoop.vpn.CONNECT"
        const val ACTION_DISCONNECT = "com.zoop.vpn.DISCONNECT"
        const val EXTRA_PEER_KEY = "com.zoop.vpn.PEER_KEY"
        const val EXTRA_WG_PRIV_KEY = "com.zoop.vpn.WG_PRIV_KEY"
        const val EXTRA_IDENTITY_KEY = "com.zoop.vpn.IDENTITY_KEY"
        const val EXTRA_CANDIDATES = "com.zoop.vpn.CANDIDATES"
        const val EXTRA_RELAY_URL = "com.zoop.vpn.RELAY_URL"
        const val EXTRA_ROUTING_MODE = "com.zoop.vpn.ROUTING_MODE"
        const val EXTRA_KILL_SWITCH = "com.zoop.vpn.KILL_SWITCH"
        const val EXTRA_CLIENT_IP = "com.zoop.vpn.CLIENT_IP"
        const val EXTRA_ZERO_BALANCE = "com.zoop.vpn.ZERO_BALANCE"
        const val EXTRA_CARRIER_KEY = "com.zoop.vpn.CARRIER_KEY"
        const val EXTRA_PEER_ENDPOINT_ID = "com.zoop.vpn.PEER_ENDPOINT_ID"

        var isRunning: Boolean = false
        var lastEmittedEvent: Map<String, Any>? = null
        var eventListener: ((Map<String, Any>) -> Unit)? = null
    }
}
