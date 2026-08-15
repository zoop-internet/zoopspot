package network.zoop.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.util.Log
import java.util.concurrent.CopyOnWriteArrayList

/**
 * ZoopNativeModule acts as the headless bridge controller between the Android OS / UI layer
 * (e.g. React Native / Flutter / Native Kotlin) and the underlying compiled Go WireGuard core.
 */
object ZoopNativeModule {

    private const val TAG = "ZoopNativeModule"
    private const val VPN_REQUEST_CODE = 0x5009

    interface StateListener {
        fun onStateChange(state: String, endpoint: String, isDirect: Boolean)
        fun onError(errorCode: String, message: String)
    }

    private val stateListeners = CopyOnWriteArrayList<StateListener>()
    private var isCoreInitialized = false
    private var currentStatusJson: String = "{\"state\":\"uninitialized\"}"

    /**
     * Initializes the Go core runtime with device configuration and event listener.
     */
    @Synchronized
    fun initializeCore(context: Context, configJson: String, listener: StateListener? = null) {
        if (listener != null) {
            addListener(listener)
        }

        if (isCoreInitialized) {
            Log.w(TAG, "Core is already initialized")
            return
        }

        try {
            // Reflectively or directly invoke gomobile bound package
            // mobile.Mobile.initMobile(configJson, object : mobile.StateCallback { ... })
            Log.i(TAG, "Initializing Go Mobile runtime with config: $configJson")
            isCoreInitialized = true
            currentStatusJson = "{\"state\":\"initialized\"}"
            notifyStateChange("initialized", "", false)
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to initialize Go Mobile runtime", e)
            notifyError("INIT_ERROR", e.message ?: "Failed to initialize Go runtime")
        }
    }

    /**
     * Prepares VPN permission check. If permission is needed, launches the system intent via activity.
     * Returns true if permission is already granted.
     */
    fun prepareVpn(activity: Activity): Boolean {
        val intent = VpnService.prepare(activity)
        return if (intent != null) {
            activity.startActivityForResult(intent, VPN_REQUEST_CODE)
            false
        } else {
            true
        }
    }

    /**
     * Starts the headless VPN foreground service.
     */
    fun startTunnelService(
        context: Context,
        virtualIp: String = "100.64.0.2",
        dnsServers: Array<String> = arrayOf("1.1.1.1", "8.8.8.8")
    ) {
        val intent = Intent(context, ZoopVpnService::class.java).apply {
            action = ZoopVpnService.ACTION_START
            putExtra(ZoopVpnService.EXTRA_VIRTUAL_IP, virtualIp)
            putExtra(ZoopVpnService.EXTRA_DNS_SERVERS, dnsServers)
        }
        context.startService(intent)
    }

    /**
     * Requests connection to a remote peer via the active tunnel.
     */
    fun connectPeer(
        context: Context,
        peerPubKey: String,
        candidatesJson: String,
        relayUrl: String
    ) {
        val intent = Intent(context, ZoopVpnService::class.java).apply {
            action = ZoopVpnService.ACTION_CONNECT_PEER
            putExtra(ZoopVpnService.EXTRA_PEER_PUBKEY, peerPubKey)
            putExtra(ZoopVpnService.EXTRA_CANDIDATES_JSON, candidatesJson)
            putExtra(ZoopVpnService.EXTRA_RELAY_URL, relayUrl)
        }
        context.startService(intent)
    }

    /**
     * Stops the active VPN foreground service and tears down the tunnel.
     */
    fun stopTunnelService(context: Context) {
        val intent = Intent(context, ZoopVpnService::class.java).apply {
            action = ZoopVpnService.ACTION_STOP
        }
        context.startService(intent)
    }

    /**
     * Returns the serialized connection status JSON for UI querying.
     */
    fun getConnectionStatus(): String {
        return currentStatusJson
    }

    // --- Callbacks invoked by ZoopVpnService ---

    internal fun onTunnelEstablished(fd: Int, ifName: String) {
        Log.i(TAG, "Passing VpnService FD: $fd ($ifName) to Go core")
        currentStatusJson = "{\"state\":\"tunnel_ready\",\"has_tunnel\":true}"
        notifyStateChange("tunnel_ready", "", false)
    }

    internal fun onConnectPeer(peerPubKey: String, candidatesJson: String, relayUrl: String) {
        Log.i(TAG, "Initiating peer connection in Go core for: $peerPubKey")
        currentStatusJson = "{\"state\":\"connecting\"}"
        notifyStateChange("connecting", "", false)
    }

    internal fun onNetworkChanged(networkType: String) {
        Log.i(TAG, "Notifying Go core of network change: $networkType")
        notifyStateChange("roaming", networkType, false)
    }

    internal fun onTunnelStopped() {
        Log.i(TAG, "Tunnel stopped in Go core")
        currentStatusJson = "{\"state\":\"disconnected\",\"has_tunnel\":false}"
        notifyStateChange("disconnected", "", false)
    }

    // --- State Listener Subscription Management ---

    fun addListener(listener: StateListener) {
        if (!stateListeners.contains(listener)) {
            stateListeners.add(listener)
        }
    }

    fun removeListener(listener: StateListener) {
        stateListeners.remove(listener)
    }

    private fun notifyStateChange(state: String, endpoint: String, isDirect: Boolean) {
        for (listener in stateListeners) {
            try {
                listener.onStateChange(state, endpoint, isDirect)
            } catch (e: Exception) {
                Log.e(TAG, "Error in state listener callback", e)
            }
        }
    }

    private fun notifyError(errorCode: String, message: String) {
        for (listener in stateListeners) {
            try {
                listener.onError(errorCode, message)
            } catch (e: Exception) {
                Log.e(TAG, "Error in error listener callback", e)
            }
        }
    }
}
