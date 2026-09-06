# ZOOP: The Real MVP Roadmap

This roadmap defines the precise, step-by-step execution plan to take ZOOP from a proven backend architecture to a **shippable, consumer-ready Minimum Viable Product (MVP)**. 

The core networking (Data Plane, Control Plane, Cloud Infrastructure) is **done**. The focus is now entirely on **Distribution, Mobile UI, Native App Integration, and Public Launch**.

---

## Phase 1: Production Polish & Legal (Store Prerequisites)
*Before submitting any VPN or networking app to the Apple App Store or Google Play Store, specific infrastructure and legal prerequisites must be met.*

- [ ] **1.1 Custom Domain Integration**
  - [ ] Purchase/configure `zoop.network` (or chosen domain).
  - [ ] Map Cloudflare Pages web app to `app.zoop.network`.
  - [ ] Map AWS EC2 API to `api.zoop.network` and update Caddy TLS certificates.
  - [ ] Update frontend environment variable (`VITE_API_BASE`) to use the new API domain.
- [ ] **1.2 Legal & Compliance (Mandatory for App Stores)**
  - [ ] Draft a clear **Privacy Policy** (explicitly stating ZOOP does not log payload traffic, as required by Apple/Google VPN guidelines).
  - [ ] Draft **Terms of Service** / EULA.
  - [ ] Host legal documents on the Cloudflare Pages web app (e.g., `zoop.network/privacy`).
  - [ ] Set up a support email (e.g., `support@zoop.network`) for the app store listings.

---

## Phase 2: Desktop Client MVP (Quick Wins)
*The Go daemon (`zoopd`) and CLI (`zoop`) work beautifully. We need to package them so normal users can install them without running a terminal compiler.*

- [ ] **2.1 Linux Distribution**
  - [ ] Create a `.deb` package (Debian/Ubuntu) bundling the `zoop` and `zoopd` binaries.
  - [ ] Include the systemd service file in the `.deb` post-install script.
  - [ ] Create a `.rpm` package (Fedora/RHEL).
- [ ] **2.2 macOS Distribution**
  - [ ] Package the binaries into a macOS `.pkg` installer.
  - [ ] Include the `launchd` plist for background daemon execution.
  - [ ] Sign and notarize the `.pkg` using an Apple Developer ID (prevents Gatekeeper blocking).
- [ ] **2.3 Windows Distribution**
  - [ ] Compile the `zoopd` Windows Service wrapper.
  - [ ] Create an NSIS or WiX `.msi` installer.
  - [ ] Include Wintun driver installation in the Windows setup process.
  - [ ] Digitally sign the `.exe` and `.msi` with an EV Code Signing Certificate.
- [ ] **2.4 CI/CD Automation**
  - [ ] Configure GitHub Actions to automatically build and attach these installers to GitHub Releases on git tags.

---

## Phase 3: Mobile App Foundation (Flutter)
*Building the cross-platform mobile UI using Flutter, ensuring a premium, non-traditional "dark mode" network aesthetic.*

- [ ] **3.1 Project Initialization**
  - [ ] Initialize the Flutter project (`zoop_mobile`).
  - [ ] Configure App Icons, Splash Screens, and package names (`network.zoop.app`).
- [ ] **3.2 Design System Implementation**
  - [ ] Implement the dark-mode color palette (deep surfaces, cyan/green accents).
  - [ ] Set up global typography and theme data.
  - [ ] Build reusable UI components: Node/Orbital connection animations, custom buttons, biometric lock screens.
- [ ] **3.3 State Management & Architecture**
  - [ ] Set up Riverpod or Bloc for predictable state management.
  - [ ] Implement GoRouter for deep-linking and screen navigation.
- [ ] **3.4 Local Secure Storage**
  - [ ] Integrate `flutter_secure_storage` (Keychain on iOS, Keystore on Android).
  - [ ] Write the local repository to securely store the user's Ed25519 identity keypair.

---

## Phase 4: Mobile Onboarding & Identity (Flutter UI)
*The user's first experience when opening the ZOOP app.*

- [ ] **4.1 Welcome Screens**
  - [ ] Build a 3-page swipeable introduction explaining ZOOP (Decentralized, Peer-to-Peer, Secure).
- [ ] **4.2 Identity Generation**
  - [ ] UI: "Generate My Zoop Identity" button with a cryptographic loading animation.
  - [ ] Logic: Generate the Ed25519 keypair securely on the device.
  - [ ] Logic: Call the `zoop-cloud` API to register the device.
- [ ] **4.3 Security & Recovery**
  - [ ] UI: Display the backup phrase or QR code for identity recovery.
  - [ ] Logic: Require OS biometric authentication (FaceID / Fingerprint) to view the recovery key.

---

## Phase 5: Native VPN Networking Bridge (The Hardest Mobile Part)
*Connecting the beautiful Flutter UI to the raw Go networking engine via native OS VPN APIs.*

- [ ] **5.1 Android Native Wiring (`ZoopVpnService.kt`)**
  - [ ] Establish Flutter `MethodChannel` to communicate with the Android background service.
  - [ ] Implement the `VpnService.prepare()` permission dialog (Prompts user: "ZOOP wants to set up a VPN connection...").
  - [ ] Wire Go library callbacks (State, Ping, Bandwidth) into Android `EventChannel` streams to push to Flutter.
- [ ] **5.2 iOS Native Wiring (`ZoopPacketTunnelProvider.swift`)**
  - [ ] Establish Flutter `MethodChannel` to communicate with the iOS NetworkExtension.
  - [ ] Handle the iOS VPN Profile installation prompt (`NETunnelProviderManager.loadAllFromPreferences`).
  - [ ] Pass Go library state metrics across the iOS XPC boundary into Flutter streams.
- [ ] **5.3 Cross-Platform Control Logic**
  - [ ] Implement start/stop tunnel commands from Flutter to the native bridges.
  - [ ] Implement graceful disconnects when the app is swiped away (or maintain foreground service).

---

## Phase 6: Mobile Core UI - Connecting (Recipient Mode)
*The screens where users actually connect to the mesh network.*

- [ ] **6.1 The Dashboard**
  - [ ] Build the Home Screen showing the device's current IP and connection status (Disconnected / Direct / Relay).
  - [ ] Fetch and display a list of available authorized Providers.
- [ ] **6.2 The Connection Experience**
  - [ ] Tap a Provider -> Trigger Orbital connecting animation.
  - [ ] Handle STUN/TURN negotiation state UI (e.g., "Punching NAT...", "Establishing Direct Tunnel...").
- [ ] **6.3 Live Telemetry**
  - [ ] Build a real-time graph showing upstream/downstream bandwidth.
  - [ ] Display connection health metrics: RTT (Ping), Protocol (WireGuard), Route (Direct vs Relay).

---

## Phase 7: Mobile Core UI - Sharing (Provider Mode)
*Allowing a mobile device to act as a secure gateway for others.*

- [ ] **7.1 Provider Toggle**
  - [ ] UI: A prominent toggle to "Share My Connection".
  - [ ] Logic: Signal the `zoop-cloud` that this device is now accepting inbound requests.
- [ ] **7.2 Connected Peers Management**
  - [ ] UI: Display a list of currently connected Recipient devices.
  - [ ] Display individual bandwidth consumption per peer.
  - [ ] UI/Logic: "Kick" or "Block" button to instantly terminate a peer's WireGuard session.
- [ ] **7.3 Connection Approvals**
  - [ ] Listen for inbound connection requests via WebSocket signaling.
  - [ ] Display a local push notification: "Device X wants to connect".

---

## Phase 8: Quality Assurance & Pre-Launch Hardening
*Testing the mobile apps against real-world chaos before the public sees them.*

- [ ] **8.1 Network Roaming Tests**
  - [ ] Connect app, walk out of Wi-Fi range into 4G LTE. Verify the tunnel reconnects without dropping active TCP sessions.
- [ ] **8.2 Battery & Memory Profiling**
  - [ ] Leave the app connected overnight. Measure Android Doze mode impact.
  - [ ] Ensure iOS doesn't terminate the NetworkExtension due to memory limits (50MB cap on iOS).
- [ ] **8.3 Internal Beta Distribution**
  - [ ] Submit iOS build to Apple TestFlight (Internal testing).
  - [ ] Submit Android build to Google Play Console (Internal testing track).
  - [ ] Distribute to core team for daily driver usage.

---

## Phase 9: Public Launch & Store Approvals
*The final bureaucratic and marketing steps to get into the hands of global users.*

- [ ] **9.1 App Store Metadata**
  - [ ] Design and generate high-resolution screenshots for 6.5" and 5.5" iOS displays, and Android equivalents.
  - [ ] Write App Store descriptions highlighting privacy, direct connections, and mesh routing.
- [ ] **9.2 Compliance Questionnaires**
  - [ ] Complete Google Play's "Data Safety" form (CRITICAL: Declare no payload data collection).
  - [ ] Complete Apple's Privacy Label questionnaire.
  - [ ] Provide Apple Review team with a demo account/video of the connection process if requested.
- [ ] **9.3 The Launch**
  - [ ] Pass Apple App Store Review.
  - [ ] Pass Google Play Store Review.
  - [ ] Flip the switch: Public release. 🚀
