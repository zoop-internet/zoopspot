# Zoop Abuse, Safety, and Enforcement

## 1. Overview

Zoop enables authorized devices to share network connectivity.

Because a Provider endpoint allows a Recipient to access the Internet through its local network connection, Zoop must provide **safety, abuse prevention, traffic policies, and quota enforcement** to protect both Providers and Recipients.

These mechanisms respect the core Zoop architectural rule:

> **The Control Plane coordinates policies and permissions; the Provider endpoint enforces them locally on the Data Plane.**

---

## 2. The Provider Safety Model

When a Recipient accesses the Internet through a Provider, the outbound traffic exits to the public Internet using the Provider's local IP address.

Zoop provides several layers of protection for Providers:

```text
Provider Endpoint
    │
    ├── Explicit Sharing Controls (Who is allowed to connect)
    ├── Local Traffic Filtering   (Port & domain restrictions)
    ├── Quota & Bandwidth Enforcer(Local byte-metering)
    └── Privacy-Preserving Logs   (Control Plane connection metadata)
```

Providers remain in full control of their shared connectivity at all times.

---

## 3. Explicit Sharing & Consent

Connectivity is never shared anonymously or by default.

A Provider must explicitly authorize access through:

* **Direct Device Pairing:** Individual peer-to-peer authorization.
* **Trusted Circles:** Restricted access for family or friends.
* **Organization Policies:** Administrative rule sets for managed network endpoints.

An unauthorized device can never use a Provider's network connection.

---

## 4. Provider Local Traffic Filtering

Providers may apply local traffic filtering rules to control what types of traffic Recipient endpoints are permitted to send through the tunnel.

Supported policy controls include:

```text
Outbound Port Blocking (e.g. blocking SMTP port 25 to prevent email spam)
Protocol Restrictions  (e.g. restricting peer-to-peer file sharing protocols)
DNS Content Filtering  (e.g. blocking known malicious or adult domains via local DNS)
```

Filtering is executed **locally on the Provider device** using OS-native firewall tools (such as `nftables`/`iptables` on Linux, or native packet filters on mobile) without routing traffic through Zoop Cloud.

---

## 5. Local Quota Enforcement & Byte-Metering

Providers can establish usage limits for Recipients (such as data volume quotas or time windows).

Because Zoop Cloud does not process Data Plane traffic, usage is measured and enforced directly on the Provider endpoint:

```text
Provider Zoop Agent
       │
       ├── Monitors WireGuard interface byte counters (rx_bytes / tx_bytes)
       │
       ├── Reaches quota threshold?
       │        │
       │        ▼
       └── Instantly tears down local WireGuard peer session
```

### Telemetry & Reporting
Periodically, the Provider Agent reports aggregated usage statistics (total bytes transferred per session) back to the Control Plane API via `/v1/connections/{id}` to synchronize quota tracking across devices.

---

## 6. Legal Boundaries & Privacy Protection

Zoop balances Provider protection with Recipient privacy:

1. **No Content Inspection in the Cloud:** Zoop Cloud never inspects, logs, or proxies user payload traffic.
2. **Control Plane Connection Records:** Zoop Cloud maintains timestamped metadata of authorized connections:
   ```json
   {
     "connection_id": "conn_123",
     "provider_device_id": "dev_prov_456",
     "recipient_device_id": "dev_recip_789",
     "established_at": "2026-08-09T02:00:00Z",
     "terminated_at": "2026-08-09T02:30:00Z"
   }
   ```
   This record provides cryptographic proof of which authorized endpoint used a Provider's connection during a specific timeframe, protecting Providers against unverified legal claims.

---

## 7. Recipient Protection & Security

Recipients are also protected against malicious Providers:

* **End-to-End Encryption:** All traffic traveling between Recipient and Provider over the Zoop Data Plane is encrypted using **WireGuard** (Noise protocol).
* **HTTPS / TLS Pass-through:** Higher-layer TLS sessions (HTTPS, SSH, etc.) initiated by the Recipient remain encrypted end-to-end to destination Internet servers. Providers cannot decrypt or inspect HTTPS traffic.
* **Malicious Provider Isolation:** The Recipient Agent isolates local Recipient LAN traffic from the Zoop tunnel interface to prevent Providers from probing Recipient local devices.

---

## 8. Summary of Principles

* **Consent First:** No sharing without explicit authorization.
* **Local Enforcement:** Quotas and filters are enforced on the endpoint, keeping the cloud out of the traffic path.
* **Zero Payload Interception:** Neither Zoop Cloud nor relays inspect payload data.
* **Mutual Protection:** Providers control their bandwidth; Recipients keep their payload data private.
