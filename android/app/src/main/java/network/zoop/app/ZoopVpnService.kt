package network.zoop.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.IOException

/**
 * ZoopVpnService provides headless low-level tunnel establishment on Android
 * using the platform's VpnService API and wires the tunnel FileDescriptor directly
 * into the compiled Go mobile WireGuard data plane.
 */
class ZoopVpnService : VpnService() {

    companion object {
        private const val TAG = "ZoopVpnService"
        const val ACTION_START = "network.zoop.app.ACTION_START"
        const val ACTION_STOP = "network.zoop.app.ACTION_STOP"
        const val ACTION_CONNECT_PEER = "network.zoop.app.ACTION_CONNECT_PEER"

        const val EXTRA_CONFIG_JSON = "extra_config_json"
        const val EXTRA_PEER_PUBKEY = "extra_peer_pubkey"
        const val EXTRA_CANDIDATES_JSON = "extra_candidates_json"
        const val EXTRA_RELAY_URL = "extra_relay_url"
        const val EXTRA_VIRTUAL_IP = "extra_virtual_ip"
        const val EXTRA_DNS_SERVERS = "extra_dns_servers"

        private const val NOTIFICATION_CHANNEL_ID = "zoop_vpn_channel"
        private const val NOTIFICATION_ID = 1001

        var isRunning: Boolean = false
            private set
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ZoopVpnService created")
        createNotificationChannel()
        registerNetworkChangeCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_NOT_STICKY

        when (action) {
            ACTION_START -> {
                val virtualIp = intent.getStringExtra(EXTRA_VIRTUAL_IP) ?: "100.64.0.2"
                val dnsServers = intent.getStringArrayExtra(EXTRA_DNS_SERVERS) ?: arrayOf("1.1.1.1", "8.8.8.8")
                startVpnTunnel(virtualIp, dnsServers)
            }
            ACTION_CONNECT_PEER -> {
                val peerPubKey = intent.getStringExtra(EXTRA_PEER_PUBKEY) ?: ""
                val candidatesJson = intent.getStringExtra(EXTRA_CANDIDATES_JSON) ?: "[]"
                val relayUrl = intent.getStringExtra(EXTRA_RELAY_URL) ?: ""
                connectPeer(peerPubKey, candidatesJson, relayUrl)
            }
            ACTION_STOP -> {
                stopVpnTunnel()
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun startVpnTunnel(virtualIp: String, dnsServers: Array<String>) {
        if (isRunning) {
            Log.w(TAG, "VPN tunnel is already running")
            return
        }

        Log.i(TAG, "Starting VPN tunnel with IP: $virtualIp")

        try {
            // Start Foreground notification to satisfy Android background requirements
            startForeground(NOTIFICATION_ID, buildForegroundNotification("Connecting to Zoop mesh..."))

            val builder = Builder().apply {
                setSession("Zoop VPN")
                setMtu(1420)
                addAddress(virtualIp, 24)
                addRoute("0.0.0.0", 0) // Route all IPv4 traffic through Zoop
                addRoute("::", 0)      // Route all IPv6 traffic through Zoop

                for (dns in dnsServers) {
                    try {
                        addDnsServer(dns)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to add DNS server: $dns", e)
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    setMetered(false)
                }
            }

            val pfd = builder.establish()
            if (pfd == null) {
                Log.e(TAG, "Failed to establish VpnService interface: builder returned null")
                stopSelf()
                return
            }

            vpnInterface = pfd
            isRunning = true

            // Hand the underlying file descriptor to Go Core
            val fd = pfd.fd
            Log.i(TAG, "VpnService established with FD: $fd. Initializing Go data plane...")
            ZoopNativeModule.onTunnelEstablished(fd, "zoop0")

            // Update foreground notification
            updateNotification("Zoop VPN Connected")
        } catch (e: Exception) {
            Log.e(TAG, "Exception during startVpnTunnel", e)
            stopVpnTunnel()
        }
    }

    private fun connectPeer(peerPubKey: String, candidatesJson: String, relayUrl: String) {
        if (!isRunning) {
            Log.e(TAG, "Cannot connect peer: VPN tunnel not established")
            return
        }

        Log.i(TAG, "Connecting to peer: $peerPubKey via relay: $relayUrl")
        ZoopNativeModule.onConnectPeer(peerPubKey, candidatesJson, relayUrl)
    }

    private fun stopVpnTunnel() {
        Log.i(TAG, "Stopping Zoop VPN tunnel...")
        try {
            ZoopNativeModule.onTunnelStopped()
            vpnInterface?.close()
            vpnInterface = null
        } catch (e: IOException) {
            Log.e(TAG, "Error closing VPN interface", e)
        } finally {
            isRunning = false
            stopForeground(STOP_FOREGROUND_REMOVE)
        }
    }

    private fun registerNetworkChangeCallback() {
        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                val caps = connectivityManager?.getNetworkCapabilities(network) ?: return
                val netType = when {
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
                    else -> "OTHER"
                }
                Log.i(TAG, "Network changed to: $netType")
                ZoopNativeModule.onNetworkChanged(netType)
            }

            override fun onLost(network: Network) {
                Log.i(TAG, "Active network lost")
                ZoopNativeModule.onNetworkChanged("DISCONNECTED")
            }
        }

        networkCallback?.let {
            connectivityManager?.registerNetworkCallback(request, it)
        }
    }

    private fun unregisterNetworkChangeCallback() {
        networkCallback?.let {
            connectivityManager?.unregisterNetworkCallback(it)
            networkCallback = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Zoop VPN Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows active status of the Zoop encrypted mesh tunnel"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Zoop Encrypted Network")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(statusText: String) {
        val notification = buildForegroundNotification(statusText)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "ZoopVpnService destroyed")
        unregisterNetworkChangeCallback()
        stopVpnTunnel()
    }
}
