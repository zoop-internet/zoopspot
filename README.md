# ZoopSpot

<div align="center">

**Cloud-Managed Wi-Fi Hotspot Billing & Captive Portal Platform**
*Automated MTN & Airtel Mobile Money (UGX) Checkout, MikroTik RouterOS v7 & OpenWrt Integration*

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![RouterOS](https://img.shields.io/badge/RouterOS-v7.12+-blue.svg)](https://mikrotik.com)
[![OpenWrt](https://img.shields.io/badge/OpenWrt-23.05+-green.svg)](https://openwrt.org)
[![Payments](https://img.shields.io/badge/Payments-MTN%20%7C%20Airtel%20UGX-yellow.svg)](#payment-integration)
[![Tunnel](https://img.shields.io/badge/CGNAT%20Overlay-WireGuard%20(RFC%206598)-9b59b6.svg)](https://www.wireguard.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## Overview

**ZoopSpot** is an enterprise-grade, cloud-managed Wi-Fi Hotspot Billing and Captive Portal solution designed for micro-ISPs, cyber cafes, co-working spaces, hotels, and retail venues in Africa.

Unlike traditional RADIUS billing systems that require complex on-premise servers and static public IPs, ZoopSpot runs as a unified cloud control plane that commands MikroTik and OpenWrt routers over an encrypted WireGuard management overlay (`100.64.0.0/10`). Customers connect to venue Wi-Fi, select a package on the mobile-optimized captive portal, and pay instantly via MTN or Airtel Mobile Money. Once confirmed, the router automatically unbinds the client device in milliseconds.

```
                   ┌────────────────────────────────────────────────────────┐
                   │                     ZOOPSPOT CLOUD                     │
                   │  - Hotspot Fleet API & Operator Dashboard              │
                   │  - MTN & Airtel Mobile Money STK Engine (MarzPay)      │
                   │  - 8-Digit Scratch Voucher Generator                   │
                   │  - PostgreSQL / SQLite Billing Ledger                  │
                   └───────────────────▲────────────────┬───────────────────┘
                                       │                │
                        WireGuard Overlay (100.64.0.0/10) REST API / Session Unlock
                                       │                │
┌──────────────────────────────────────┴───┐        ┌───┴────────────────────────────────────┐
│      VENUE ROUTER (MikroTik RouterOS v7) │        │           CUSTOMER SMARTPHONE          │
│  - Captive Portal Redirect (/portal)     │◄──────►│  - Connects to Venue Wi-Fi             │
│  - Walled Garden: MarzPay / MTN / Airtel │  Wi-Fi │  - Selects 1 Hr (1,000 UGX) / 24 Hr    │
│  - IP-Binding Bypass: Type=bypassed      │        │  - Approves Mobile Money STK Prompt    │
│  - Rate Limiting Queues (5M down / 2M up)│        │  - Instant High-Speed Internet Access  │
└──────────────────────────────────────────┘        └────────────────────────────────────────┘
```

---

## Why ZoopSpot?

1. **Fiber Abundance vs SIM Arbitrage**: Fixed fiber (Liquid Home, MTN WakaNet, Airtel Broadband) provides cheap, uncapped, high-speed bandwidth. ZoopSpot lets entrepreneurs monetize fiber locally over Wi-Fi without SIM cards, avoiding telco billing penalties.
2. **Automated Mobile Money STK Push**: Zero manual voucher printing required. Customers enter their phone number on the captive portal, receive an instant USSD PIN prompt on their phone (MTN MoMo or Airtel Money), and their session unlocks the moment payment confirms.
3. **CGNAT Traversal via WireGuard Overlay**: Residential fiber connections sit behind Carrier-Grade NAT (CGNAT) and lack public IPv4 addresses. ZoopSpot assigns each router a private `/30` overlay IP (`100.64.x.x`), allowing the cloud to command RouterOS REST API securely from anywhere.
4. **Resilient Walled Garden**: Customers can access the payment gateway (`wallet.wearemarz.com`, `mtn.co.ug`, `airtel.co.ug`) and the ZoopSpot captive portal even before paying.
5. **Offline Cash Scratch Vouchers**: In areas with cash preference, operators can batch-generate 8-digit alphanumeric scratch vouchers with customizable durations and speed caps.
6. **10-Minute Ad Lifeline**: Allows stranded customers a one-time 10-minute internet lifeline every 24 hours to recharge their phone or message friends.

---

## System Architecture

ZoopSpot is built on a clean, scalable Go backend and a modern React + TypeScript frontend:

```
zoopspot/
├── cloud/                      # Production Cloud Entrypoint
│   └── main.go                 # HTTP server, DB migrations, WireGuard overlay init
├── packages/
│   ├── cloud/
│   │   ├── hotspot/            # Core Hotspot Engine
│   │   │   ├── controller.go   # MikroTik RouterOS REST API & OpenWrt client
│   │   │   ├── mikrotik.go     # RouterOS v7 auto-provisioning script generator
│   │   │   ├── service.go      # Business logic: checkout, vouchers, lifelines
│   │   │   └── voucher.go      # Cryptographic 8-character voucher generator
│   │   ├── payments/           # Ugandan Mobile Money & MarzPay Integration
│   │   ├── server/             # REST Endpoints: /v1/hotspots/* & /v1/portal/*
│   │   └── store/              # PostgreSQL & In-Memory Storage Engines
│   └── core/
│       └── types/              # Domain Models (Hotspot, Package, Session, Voucher)
└── web/                        # Modern Web Console & Captive Portal
    ├── src/
    │   ├── portal/             # Mobile-First Captive Portal (/portal)
    │   │   ├── CaptivePortal.tsx
    │   │   └── CaptivePortal.css
    │   └── app/user/           # Operator Hotspots & Fleet Management
    │       └── HotspotsTab.tsx
```

---

## MikroTik RouterOS v7 One-Click Setup

ZoopSpot generates a complete, tailored RouterOS v7 setup script directly from the Operator Dashboard:

1. Create a Hotspot venue in the ZoopSpot Dashboard.
2. Click **Router Setup Script** and copy the generated RouterOS v7 script.
3. Open **WinBox** or SSH into your MikroTik router, open the **Terminal**, paste the script, and press Enter:

```routeros
# ========================================================
# ZoopSpot Hotspot Auto-Provisioning Script (RouterOS v7)
# ========================================================

# 1. WireGuard Overlay Management Interface
/interface wireguard add name=wg-zoopspot listen-port=51820 private-key="<GENERATED_PRIVATE_KEY>"
/ip address add address=100.64.0.2/30 interface=wg-zoopspot
/interface wireguard peers add interface=wg-zoopspot public-key="<SERVER_PUBLIC_KEY>" \
    endpoint-address="cloud.zoopspot.network" endpoint-port=51820 \
    allowed-address=100.64.0.0/16 persistent-keepalive=25s

# 2. Secure REST API Access for Cloud Control Plane
/user group add name=zoopspot-mgmt policy=api,rest-api,read,write,test
/user add name=zoopspot-agent group=zoopspot-mgmt password="<GENERATED_SECURE_TOKEN>"
/ip service set rest-api address=100.64.0.0/16 disabled=no port=80

# 3. Walled Garden Bypass (Payments & Captive Portal)
/ip hotspot walled-garden add dst-host="*.zoopspot.network" action=allow
/ip hotspot walled-garden add dst-host="*.wearemarz.com" action=allow
/ip hotspot walled-garden add dst-host="*.mtn.co.ug" action=allow
/ip hotspot walled-garden add dst-host="*.airtel.co.ug" action=allow
```

The router immediately handshakes with ZoopSpot Cloud over WireGuard. When a customer pays, the cloud issues:
```http
PUT /rest/ip/hotspot/ip-binding
{
  "mac-address": "A4:C3:F0:12:34:56",
  "type": "bypassed",
  "comment": "zoopspot:sess_abc123"
}
```
The client is authorized instantly with zero browser redirects or captive popups.

---

## Captive Portal Experience

The captive portal (`/portal?hotspot=<slug>&mac=<mac>&ip=<ip>`) provides:
- **Telco Auto-Detection**: Detects MTN vs Airtel from phone number prefixes (`077`, `078`, `076` for MTN; `070`, `075`, `074` for Airtel).
- **Live USSD Push**: Prompts customer: *"Approve the prompt on your phone by entering your Mobile Money PIN"*.
- **Poll & Auto-Unlock**: Background polling detects payment webhook confirmation and starts a live countdown timer.
- **Voucher Redemption**: Fast alphanumeric code validation for retail scratch cards.
- **10-Min Free Lifeline**: One-tap emergency connectivity with 2 Mbps throttle.

---

## Running Locally

### 1. Prerequisites
- **Go 1.22+**
- **Node.js 20+**
- **PostgreSQL 14+** (or use built-in SQLite/In-Memory for development)

### 2. Start Cloud Control Plane
```bash
# Clone the repository
git clone https://github.com/zoop-internet/zoopspot.git
cd zoopspot

# Run unit and integration tests
go test ./packages/...

# Start Cloud Server
go run ./cloud/main.go
```

The server listens on `http://localhost:8080`.

### 3. Start Frontend Dashboard & Captive Portal
```bash
cd web
npm install
npm run dev
```

Visit:
- **Operator Console**: `http://localhost:5173/app/hotspots`
- **Captive Portal Preview**: `http://localhost:5173/portal?hotspot=default&mac=AA:BB:CC:11:22:33`

---

## Production Deployment

### Docker Build
```bash
# Build complete production binary
CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/zoopspot-cloud ./cloud/main.go

# Build production static frontend
cd web && npm run build
```

Configure environment variables:
```env
ZOOP_HTTP_ADDR=:8080
ZOOP_STORE_TYPE=postgres
DATABASE_URL=postgres://user:pass@host:5432/zoopspot?sslmode=require
ZOOP_MARZPAY_API_KEY=your_marzpay_token
ZOOP_WIREGUARD_PUBKEY=server_wg_public_key
ZOOP_PORTAL_BASE_URL=https://portal.zoopspot.network
```

---

## License

MIT License. Designed and engineered for high-performance public internet monetization.
