package com.zoop.vpn

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log

class ZoopVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var networkMonitor: NetworkMonitor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "Starting ZoopVpnService OS background service")

        val action = intent?.action
        if (action == ACTION_DISCONNECT) {
            stopVpn()
            return START_NOT_STICKY
        }

        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        try {
            val builder = Builder()
                .setSession("ZoopVPN")
                .addAddress("100.64.0.2", 32)
                .addRoute("100.64.0.0", 10)
                .setMtu(1420)

            vpnInterface = builder.establish()
            val fd = vpnInterface?.fd ?: -1

            Log.i(TAG, "VpnService established natively with FD=$fd")

            // Register ConnectivityManager network callbacks for instant roaming
            networkMonitor = NetworkMonitor(this) { networkType ->
                Log.i(TAG, "Network changed to: $networkType")
                // Native notification to Go bridge
            }
            networkMonitor?.start()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VpnService", e)
            stopVpn()
        }
    }

    private fun stopVpn() {
        Log.i(TAG, "Stopping ZoopVpnService")
        networkMonitor?.stop()
        vpnInterface?.close()
        vpnInterface = null
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopVpn()
    }

    companion object {
        private const val TAG = "ZoopVpnService"
        const val ACTION_CONNECT = "com.zoop.vpn.CONNECT"
        const val ACTION_DISCONNECT = "com.zoop.vpn.DISCONNECT"
    }
}
