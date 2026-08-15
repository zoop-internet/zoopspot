import NetworkExtension
import Network
import os.log

/**
 * PacketTunnelProvider manages the lifecycle of the Apple NetworkExtension
 * WireGuard virtual interface, handling packet routing and network roaming events.
 */
class PacketTunnelProvider: NEPacketTunnelProvider {

    private let log = OSLog(subsystem: "network.zoop.app", category: "PacketTunnel")
    private var pathMonitor: NWPathMonitor?
    private let pathMonitorQueue = DispatchQueue(label: "network.zoop.pathmonitor")
    private var isTunnelRunning = false

    override func startTunnel(options: [String : NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        os_log(.info, log: log, "Starting Zoop Packet Tunnel...")

        let virtualIP = (options?["virtualIP"] as? String) ?? "100.64.0.3"
        let subnetMask = "255.255.255.0"
        let mtu = 1420

        // 1. Configure Tunnel Network Settings
        let tunnelNetworkSettings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        
        // IPv4 configuration (route all traffic or split-tunnel)
        let ipv4Settings = NEIPv4Settings(addresses: [virtualIP], subnetMasks: [subnetMask])
        ipv4Settings.includedRoutes = [NEIPv4Route.default()]
        tunnelNetworkSettings.ipv4Settings = ipv4Settings

        // IPv6 configuration
        let ipv6Settings = NEIPv6Settings(addresses: ["fd00::3"], networkPrefixLengths: [64])
        ipv6Settings.includedRoutes = [NEIPv6Route.default()]
        tunnelNetworkSettings.ipv6Settings = ipv6Settings

        // DNS configuration
        let dnsSettings = NEDNSSettings(servers: ["1.1.1.1", "8.8.8.8"])
        dnsSettings.matchDomains = [""] // Intercept all domain resolutions
        tunnelNetworkSettings.dnsSettings = dnsSettings

        tunnelNetworkSettings.mtu = NSNumber(value: mtu)

        // 2. Apply Network Settings
        setTunnelNetworkSettings(tunnelNetworkSettings) { [weak self] error in
            guard let self = self else { return }

            if let error = error {
                os_log(.error, log: self.log, "Failed to apply tunnel network settings: %{public}@", error.localizedDescription)
                completionHandler(error)
                return
            }

            os_log(.info, log: self.log, "Tunnel settings applied. Initializing Go data plane...")
            self.isTunnelRunning = true
            self.startPathMonitoring()

            // In production with linked ZoopCore.xcframework:
            // ZoopCoreStartTunnel(fileDescriptor, "zoop0")
            // Or initiate packetFlow read/write loop with Go core

            completionHandler(nil)
        }
    }

    override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        os_log(.info, log: log, "Stopping Zoop Packet Tunnel with reason: %{public}d", reason.rawValue)
        
        stopPathMonitoring()
        isTunnelRunning = false

        // In production: ZoopCoreDisconnect()

        completionHandler()
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        // Allows the main UI application to send IPC commands (e.g. peer candidates, stats query)
        os_log(.debug, log: log, "Received IPC message from host application")
        
        if let messageString = String(data: messageData, encoding: .utf8) {
            os_log(.debug, log: log, "IPC Payload: %{public}@", messageString)
        }

        let response = ["status": "ok"]
        let responseData = try? JSONSerialization.data(withJSONObject: response, options: [])
        completionHandler?(responseData)
    }

    // MARK: - Network Roaming & Path Monitoring

    private func startPathMonitoring() {
        pathMonitor = NWPathMonitor()
        pathMonitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self, self.isTunnelRunning else { return }

            let interfaceType: String
            if path.usesInterfaceType(.wifi) {
                interfaceType = "WIFI"
            } else if path.usesInterfaceType(.cellular) {
                interfaceType = "CELLULAR"
            } else if path.usesInterfaceType(.wiredEthernet) {
                interfaceType = "ETHERNET"
            } else {
                interfaceType = "OTHER"
            }

            os_log(.info, log: self.log, "NWPathMonitor detected active interface change: %{public}@", interfaceType)
            
            // Notify Go core to trigger rapid ICE/STUN candidate re-probing
            // ZoopCoreNotifyNetworkChange(interfaceType)
        }

        pathMonitor?.start(queue: pathMonitorQueue)
    }

    private func stopPathMonitoring() {
        pathMonitor?.cancel()
        pathMonitor = nil
    }
}
