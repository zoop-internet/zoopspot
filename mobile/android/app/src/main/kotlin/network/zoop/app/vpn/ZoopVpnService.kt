package network.zoop.app.vpn

import android.content.Intent
import android.net.VpnService
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.util.Log

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
    external fun getConnectionStatus(): String
    external fun disconnect()
}

class ZoopVpnService : VpnService(), ZoopStateCallback {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var networkMonitor: NetworkMonitor? = null
    private val mainHandler = Handler(Looper.getMainLooper())

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
        try {
            val builder = Builder()
                .setSession("ZoopVPN")
                .addAddress("100.64.0.2", 32)
                .addRoute("100.64.0.0", 10)
                .setMtu(1420)

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
        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing VPN interface: ${e.message}")
        }
        vpnInterface = null
        stopSelf()
    }

    override fun onStateChange(state: String, endpoint: String, isDirect: Boolean) {
        Log.i(TAG, "State changed: state=$state endpoint=$endpoint isDirect=$isDirect")
        emitState(state, endpoint, isDirect)
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
        const val ACTION_CONNECT = "com.zoop.vpn.CONNECT"
        const val ACTION_DISCONNECT = "com.zoop.vpn.DISCONNECT"
        const val EXTRA_PEER_KEY = "com.zoop.vpn.PEER_KEY"
        const val EXTRA_CANDIDATES = "com.zoop.vpn.CANDIDATES"
        const val EXTRA_RELAY_URL = "com.zoop.vpn.RELAY_URL"

        var isRunning: Boolean = false
        var eventListener: ((Map<String, Any>) -> Unit)? = null
    }
}
