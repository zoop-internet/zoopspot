import Foundation
import NetworkExtension
import os.log

/**
 * ZoopNativeBridge provides a headless Swift controller for managing the iOS VPN profile,
 * launching the PacketTunnelProvider extension, and bridging state changes to UI frameworks
 * (React Native / Flutter / Native Swift).
 */
@objc(ZoopNativeBridge)
public final class ZoopNativeBridge: NSObject {

    @objc public static let shared = ZoopNativeBridge()
    private let log = OSLog(subsystem: "network.zoop.app", category: "Bridge")
    
    private var tunnelManager: NETunnelProviderManager?
    private var statusObserver: Any?
    
    @objc public var onStateChanged: ((String) -> Void)?

    private override init() {
        super.init()
    }

    /**
     * Loads or creates the Zoop VPN system configuration profile.
     */
    @objc public func setupVPNProfile(completion: @escaping (Bool, Error?) -> Void) {
        os_log(.info, log: log, "Loading existing VPN tunnel managers...")

        NETunnelProviderManager.loadAllFromPreferences { [weak self] managers, error in
            guard let self = self else { return }

            if let error = error {
                os_log(.error, log: self.log, "Failed to load VPN preferences: %{public}@", error.localizedDescription)
                completion(false, error)
                return
            }

            let manager = managers?.first ?? NETunnelProviderManager()
            let protocolConfiguration = NETunnelProviderProtocol()
            protocolConfiguration.providerBundleIdentifier = "network.zoop.app.packet-tunnel"
            protocolConfiguration.serverAddress = "Zoop Mesh"

            manager.protocolConfiguration = protocolConfiguration
            manager.localizedDescription = "Zoop Encrypted Network"
            manager.isEnabled = true

            manager.saveToPreferences { saveError in
                if let saveError = saveError {
                    os_log(.error, log: self.log, "Failed to save VPN profile: %{public}@", saveError.localizedDescription)
                    completion(false, saveError)
                    return
                }

                manager.loadFromPreferences { reloadError in
                    self.tunnelManager = manager
                    self.observeTunnelStatus()
                    os_log(.info, log: self.log, "Zoop VPN profile configured successfully")
                    completion(reloadError == nil, reloadError)
                }
            }
        }
    }

    /**
     * Starts the VPN tunnel with specified options.
     */
    @objc public func startTunnel(options: [String: Any]? = nil, completion: @escaping (Error?) -> Void) {
        guard let manager = tunnelManager else {
            let error = NSError(domain: "network.zoop.app", code: -1, userInfo: [NSLocalizedDescriptionKey: "VPN profile not configured. Call setupVPNProfile first."])
            completion(error)
            return
        }

        do {
            let tunnelOptions = (options as? [String: NSObject]) ?? [:]
            try (manager.connection as? NETunnelProviderSession)?.startTunnel(options: tunnelOptions)
            os_log(.info, log: log, "Start tunnel command sent to provider")
            completion(nil)
        } catch {
            os_log(.error, log: log, "Error starting tunnel: %{public}@", error.localizedDescription)
            completion(error)
        }
    }

    /**
     * Stops the active VPN tunnel.
     */
    @objc public func stopTunnel() {
        os_log(.info, log: log, "Stopping VPN tunnel...")
        (tunnelManager?.connection as? NETunnelProviderSession)?.stopTunnel()
    }

    /**
     * Returns the current connection state as a string.
     */
    @objc public func getStatus() -> String {
        guard let connection = tunnelManager?.connection else { return "disconnected" }
        return stringFromStatus(connection.status)
    }

    // MARK: - Private Helpers & Observers

    private func observeTunnelStatus() {
        if let observer = statusObserver {
            NotificationCenter.default.removeObserver(observer)
        }

        statusObserver = NotificationCenter.default.addObserver(
            forName: .NEVPNStatusDidChange,
            object: tunnelManager?.connection,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            let status = self.getStatus()
            os_log(.info, log: self.log, "VPN status changed to: %{public}@", status)
            self.onStateChanged?(status)
        }
    }

    private func stringFromStatus(_ status: NEVPNStatus) -> String {
        switch status {
        case .invalid: return "invalid"
        case .disconnected: return "disconnected"
        case .connecting: return "connecting"
        case .connected: return "connected"
        case .reasserting: return "reasserting"
        case .disconnecting: return "disconnecting"
        @unknown default: return "unknown"
        }
    }

    deinit {
        if let observer = statusObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
