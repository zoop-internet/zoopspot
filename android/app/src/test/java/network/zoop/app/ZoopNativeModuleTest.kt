package network.zoop.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ZoopNativeModuleTest {

    @Test
    fun testInitialStatus() {
        val status = ZoopNativeModule.getConnectionStatus()
        assertTrue(status.contains("state"))
    }

    @Test
    fun testStateListenerCallbacks() {
        var stateReceived = ""
        val listener = object : ZoopNativeModule.StateListener {
            override fun onStateChange(state: String, endpoint: String, isDirect: Boolean) {
                stateReceived = state
            }

            override fun onError(errorCode: String, message: String) {}
        }

        ZoopNativeModule.addListener(listener)
        ZoopNativeModule.onTunnelEstablished(42, "zoop0")
        
        assertEquals("tunnel_ready", stateReceived)
        assertTrue(ZoopNativeModule.getConnectionStatus().contains("tunnel_ready"))

        ZoopNativeModule.onTunnelStopped()
        assertEquals("disconnected", stateReceived)
        assertTrue(ZoopNativeModule.getConnectionStatus().contains("disconnected"))

        ZoopNativeModule.removeListener(listener)
    }
}
