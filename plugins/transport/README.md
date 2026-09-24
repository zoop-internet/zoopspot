# Zoop Pluggable Transport Plugin

**Zero-Balance Carrier Underlay & Anti-Censorship Transport for Zoop Internet**

---

## 1. Executive Summary & Why This Exists

### The Mission
Zoop allows a device with surplus internet (e.g., unlimited home fiber in Kampala, Nairobi, or Lagos) to share its bandwidth with a remote recipient who has no internet (e.g., a family member in a rural village with 0 MB of mobile data), across any physical distance.

### The Problem: The "Last-Mile Cellular Barrier"
In emerging markets, home/office fiber is paid as an uncapped monthly flat fee, but mobile cellular data on SIM cards (MTN, Airtel, Safaricom) is expensive, metered per megabyte, and quickly exhausted.

When a recipient has **0 MB balance** (or only 1 MB for an initial handshake):
1. **Plain WireGuard Fails**: Standard WireGuard transmits raw UDP packets on port `51820`. 
2. **Carrier Base Station Gate**: The telecom's radio tower and Packet Gateway (PGW/UPF) check the SIM card balance. If the balance is 0 MB, the tower immediately **drops all outgoing and incoming UDP packets**.
3. **The Result**: Even though the provider at home has gigabytes of uncapped fiber ready to share, the packets cannot physically cross the telecom's radio airwaves to reach the recipient's phone.

### The Courier Analogy
* **Google / YouTube**: The warehouse.
* **The Provider (Home Fiber)**: A friend who paid for the goods at the warehouse.
* **The Recipient (Village Phone)**: The person waiting for the package.
* **The Telecom (MTN / Airtel)**: The courier delivering the physical package over the road.

If the courier charges per kilogram to deliver packages, the recipient cannot receive a 50 kg package with only 1 kg of money, even if the friend in the city paid the warehouse. The courier will drop the package on the roadside.

**The Solution**: The courier has a policy: *"Medical and emergency supplies (zero-rated carrier websites like MoMo, self-care, or e-learning) are delivered for free."* 

The **Zoop Transport Plugin** stamps the package with the zero-rated carrier disguise so the telecom courier delivers the full bandwidth stream across the cell tower without deducting the user's mobile data.

---

## 2. What We Have Built & Verified So Far

We have already completed and verified the hardest 90% of the platform:

```text
[ Android Device (Client) ]
   ├── VpnService (tun0) capturing all device packets
   ├── libzoop.so (WireGuard Go cryptography engine)
   └── Socket protection against routing loops
            │
            │  End-to-End Encrypted Tunnel (Noise_IK)
            ▼
[ Linux Gateway (zoopd) ]
   ├── zoop0 TUN interface
   ├── Kernel IP forwarding (net.ipv4.ip_forward = 1)
   ├── iptables NAT MASQUERADE
   └── Egress to Public Internet (Google, Cloudflare: 0% loss verified)
```

### Verified Milestones:
*  **Core Android Data Plane**: `tun0` MTU clamping, routing table initialization, and JNI lifecycle.
*  **Gateway NAT & Forwarding**: Verified bidirectional packet flow from phone to public internet.
*  **Relay Architecture**: WebSocket Relay Server (`packages/cloud/relay/server.go`) and Relay Bridge (`packages/agent/tunnel/relay_bridge.go`) already exist in the codebase.

---

## 3. How the Transport Plugin Works

The Transport Plugin sits between the **WireGuard Tunnel Engine** and the **Physical Network Interface**:

```text
[ Android App (Recipient) ]
         │
    (tun0 WireGuard) ◄── [Existing Verified Core]
         │
         ▼
[ Zoop Pluggable Transport (Client) ]
         │
         │  TLS Port 443 with Carrier SNI Masking
         │  OR DNS Port 53 Tunneling
         ▼
[ Telecom Cell Tower / DPI ]  ──► (Sees allowed zero-rated host -> Passes for free)
         ▼
[ Cloudflare CDN Edge / Zoop Relay ]
         │  (Unwraps outer carrier disguise)
         ▼
[ Your Home Provider (zoopd) ] ◄── [Existing Verified Core]
         │
         ▼
   [ Free Public Internet ]
```

---

## 4. The Two Transport Engines

### Engine A: SNI-Masked WebSocket (High Speed — Recommended)
* **Target**: Full 4G video streaming, web browsing, and downloads.
* **Mechanism**:
  1. The client wraps WireGuard frames inside a secure WebSocket connection over **Port 443 (HTTPS)**.
  2. The TLS handshake writes a **Server Name Indication (SNI)** header matching an active carrier zero-rated host (e.g., `pass.mtn.co.ug`, education portals, or MoMo self-care).
  3. The telecom Deep Packet Inspection (DPI) sees the whitelisted SNI and permits the connection with 0 MB balance.
  4. The traffic routes through Cloudflare CDN to the Zoop Relay, which unwraps it and bridges it to `zoopd`.

### Engine B: SlowDNS Tunnel (Fallback — Guaranteed Penetration)
* **Target**: Low-bandwidth emergency connection, WhatsApp messaging, and persistent discovery.
* **Mechanism**:
  1. Telecoms leave **UDP Port 53 (DNS)** open even with 0 balance so devices can resolve carrier top-up portals.
  2. WireGuard frames are base32-encoded into DNS queries (`<data>.tunnel.zoop.network`).
  3. Zoop’s authoritative DNS nameserver extracts the frames and forwards them to the provider.

---

## 5. Plugin Architecture & File Structure

```text
plugins/transport/
├── README.md               # This specification and architectural roadmap
├── sni/                    # Engine A: SNI-masked WebSocket transport
│   ├── dialer.go           # Custom TLS dialer with SNI & Host spoofing
│   ├── client.go           # WebSocket underlay client for libzoop
│   └── sni_test.go         # Unit and integration tests
├── dns/                    # Engine B: DNS tunneling transport (fallback)
│   ├── client.go           # Base32 DNS packet encoder / UDP 53 dialer
│   └── server.go           # Authoritative DNS frame reassembler
└── transport.go            # Common Pluggable Transport interface
```

---

## 6. What's Next: Step-by-Step Roadmap

| Phase | Milestone | Deliverable | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Core VPN Data Plane** | Android VpnService, WireGuard Go, zoopd NAT | **COMPLETED & VERIFIED** |
| **Phase 2** | **Transport Interface & SNI Dialer** | Go module with custom TLS SNI dialer | **NEXT STEP** |
| **Phase 3** | **Cloud Relay Bridge Integration** | Connect `RelayClient` through Cloudflare CDN | Upcoming |
| **Phase 4** | **Android App Controls** | UI toggle for "Carrier Zero-Balance Mode" | Upcoming |
| **Phase 5** | **Live Physical SIM Validation** | Test with 0 MB / 1 MB balance on real carrier | Upcoming |
