import Foundation
import NetworkExtension
import os.log

/**
 * ZoopPacketTunnelProvider runs as an iOS Network Extension (Packet Tunnel Provider)
 * handling virtual network routing and bridging packets to the Go Zoop Core.
 */
class ZoopPacketTunnelProvider: NEPacketTunnelProvider {

    private let log = OSLog(subsystem: "com.zoop.mobile", category: "PacketTunnel")
    private var pathMonitor: NWPathMonitor?
    private let monitorQueue = DispatchQueue(label: "com.zoop.pathmonitor")

    override func startTunnel(options: [String: NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        os_log(.info, log: log, "Starting ZoopPacketTunnelProvider for iOS")

        // 1. Configure iOS Virtual Network Settings (100.64.0.0/10 CGNAT block)
        let networkSettings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "100.64.0.1")
        
        let ipv4Settings = NEIPv4Settings(addresses: ["100.64.0.2"], subnetMasks: ["255.255.255.252"])
        ipv4Settings.includedRoutes = [NEIPv4Route(destinationAddress: "100.64.0.0", subnetMask: "255.192.0.0")]
        networkSettings.ipv4Settings = ipv4Settings
        networkSettings.mtu = 1420

        setTunnelNetworkSettings(networkSettings) { [weak self] error in
            guard let self = self else { return }

            if let error = error {
                os_log(.error, log: self.log, "Failed to apply tunnel network settings: %{public}@", error.localizedDescription)
                completionHandler(error)
                return
            }

            os_log(.info, log: self.log, "Tunnel network settings applied successfully")

            // 2. Start NWPathMonitor for network changes (Wi-Fi <-> Cellular roaming)
            self.startNetworkMonitoring()

            // 3. Complete startup
            completionHandler(nil)
        }
    }

    override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        os_log(.info, log: log, "Stopping ZoopPacketTunnelProvider reason: %d", reason.rawValue)

        pathMonitor?.cancel()
        pathMonitor = nil

        completionHandler()
    }

    private func startNetworkMonitoring() {
        pathMonitor = NWPathMonitor()
        pathMonitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }

            let netType: String
            if path.usesInterfaceType(.wifi) {
                netType = "WIFI"
            } else if path.usesInterfaceType(.cellular) {
                netType = "CELLULAR"
            } else if path.usesInterfaceType(.wiredEthernet) {
                netType = "ETHERNET"
            } else {
                netType = "OTHER"
            }

            os_log(.info, log: self.log, "iOS network transition detected: %{public}@", netType)
        }
        pathMonitor?.start(queue: monitorQueue)
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        // IPC message handler between main iOS App and NetworkExtension
        completionHandler?(nil)
    }
}
