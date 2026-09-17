# ZOOP Deployment & Infrastructure Architecture

This document provides a comprehensive record of the production deployment of the **ZOOP** platform, including live endpoints, server configurations, credentials management, operational playbooks, and guidelines for future agents and developers.

> [!NOTE]
> **Cloud-Agnostic Architecture**: While our current primary hosting is on **AWS** and **Cloudflare Pages**, the ZOOP architecture is strictly cloud-agnostic. The Go control plane (`zoop-cloud`), Caddy reverse proxy, Coturn STUN/TURN, and database layer can be deployed on any Linux server, VPS (Hetzner, DigitalOcean, Linode), bare-metal server, or alternative cloud provider (GCP, Azure) using the exact same systemd or container configurations documented below.

---

## 1. High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Global Edge CDN                  │
│        https://zoopinternet.app / https://zoopnetwork.pages.dev       │
│   (Vite + React SPA, 24 Prerendered Static Routes, SEO)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS API Requests
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Current Host: AWS EC2 (eu-central-1)            │
│               https://3.70.135.200.sslip.io                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Caddy Reverse Proxy (:80, :443)                     │   │
│   │ - Automated Let's Encrypt TLS (HTTP/2 & HTTP/3)     │   │
│   │ - WebSocket & SSE Pass-through                      │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ localhost:8080               │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │ zoop-cloud (Go Control Plane Service)               │   │
│   │ - Ed25519 Cryptographic Auth (zoop-auth-v2)         │   │
│   │ - Signaling Hub & Device Management                 │   │
│   │ - Wildcard CORS: https://*.pages.dev                │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────┴──────────────────────────┐   │
│   │ Coturn STUN/TURN Daemon (:3478 UDP/TCP)             │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Low-latency TLS (<1ms)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Neon Serverless Postgres (AWS Frankfurt)           │
│         (*.eu-central-1.aws.neon.tech / Port 5432)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Active Infrastructure Inventory

### A. Frontend Web Application (Cloudflare Pages)
* **Status**: Live & Serving
* **Canonical Domain**: [`https://zoopinternet.app`](https://zoopinternet.app)
* **Edge Pages URL**: [`https://zoopnetwork.pages.dev`](https://zoopnetwork.pages.dev)
* **Cloudflare Project Name**: `zoopnetwork`
* **Cloudflare Account ID**: `7335973a10147fee3168dac18331dbab`
* **Build Directory**: `web/` → output `web/dist/`
* **Build Command**: `npm run build` (runs `tsc -b && vite build && node scripts/prerender.mjs`)
* **Environment Variable**: `VITE_API_BASE=https://3.70.135.200.sslip.io`
* **Custom Domains**: `zoopinternet.app`, `www.zoopinternet.app` attached.

### B. Backend Server (Current AWS Host)
* **Cloud Provider**: AWS
* **AWS Account ID**: `872738227669` (Profile: `zoop`)
* **Region**: `eu-central-1` (Frankfurt, Germany)
* **Instance ID**: `i-0f33b29368487c3bd`
* **Instance Type**: `t3.micro` (2 vCPUs, 1 GB RAM — Free Tier 750 hrs/month)
* **Public IPv4**: `3.70.135.200`
* **Hostname / SSL Endpoint**: `https://3.70.135.200.sslip.io`
* **Security Group**: `sg-01860c40fcb63f0df` (`zoop-backend-sg`)
  * `22/tcp`: SSH Management
  * `80/tcp`: HTTP (Caddy ACME challenge & redirect)
  * `443/tcp`: HTTPS (Caddy TLS termination)
  * `8080/tcp`: Direct Zoop Cloud API
  * `3478/udp` & `3478/tcp`: Coturn STUN/TURN service
* **SSH Key Pair**: `zoop-key` (Private key stored locally at `~/.ssh/zoop-key.pem` with `chmod 400`)
  * Access command: `ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200`
* **Memory Optimization**: 2 GB swap file configured on `/swapfile` (prevents OOM crashes on 1 GB RAM).

### C. Database (Neon Serverless Postgres)
* **Provider**: Neon
* **Region**: AWS `eu-central-1` (Frankfurt) — Colocated in the same data center as the backend for sub-millisecond query execution.
* **Connection Mode**: Pooled PgBouncer connection string with `?sslmode=require&channel_binding=require`.

### D. Cost Safeguards & Monitoring
* **AWS Budget**: `zoop-monthly-budget`
* **Limit**: `$5.00 / month`
* **Alert Email**: `zippuconnections@gmail.com` (triggers automated alerts at 80% actual spend or 100% forecasted spend)
* **Active Spend**: **$0.00** (strictly inside Free Tier limits).

---

## 3. Server Configuration Details

### Systemd Service: `zoop-cloud.service`
Path: `/etc/systemd/system/zoop-cloud.service`
```ini
[Unit]
Description=Zoop Cloud Control Plane Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/zoop
EnvironmentFile=/opt/zoop/.env
ExecStart=/opt/zoop/bin/zoop-cloud
Restart=always
RestartSec=5s
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

### Environment File: `/opt/zoop/.env`
> Stored securely on the server host with `chmod 600`. Replace bracketed placeholders when provisioning a new node:
```ini
ZOOP_ENV=production
ZOOP_DATABASE_URL=postgresql://neondb_owner:<NEON_DB_PASSWORD>@ep-icy-sun-b1yw1ua6-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
ZOOP_ALLOWED_ORIGINS=https://zoop.network,https://app.zoop.network,https://*.pages.dev,http://localhost:5173
ZOOP_AGENT_LISTEN_ADDR=127.0.0.1:8080
ZOOP_CONTROL_PLANE_URL=http://3.70.135.200
ZOOP_LOG_LEVEL=info
ZOOP_TURN_SECRET=<TURN_SHARED_SECRET>
ZOOP_TURN_REALM=zoop.network
ZOOP_STUN_SERVER=stun.zoop.network:3478
```

### Caddy Reverse Proxy: `/etc/caddy/Caddyfile`
```caddy
3.70.135.200.sslip.io, :80 {
    reverse_proxy 127.0.0.1:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 4. Operational Playbooks (For Future Agents & Sessions)

### Playbook 1: Deploying a Backend Update to Server
When you modify code in `cloud/` or `packages/cloud/`:

1. Rebuild the binary locally:
   ```bash
   go build -v -o bin/zoop-cloud ./cloud
   ```
2. Compress and upload to the server:
   ```bash
   gzip -c bin/zoop-cloud > /tmp/zoop-cloud.gz
   scp -i ~/.ssh/zoop-key.pem /tmp/zoop-cloud.gz ubuntu@3.70.135.200:/tmp/zoop-cloud.gz
   ```
3. Decompress, replace binary, and restart systemd:
   ```bash
   ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200 << 'EOF'
   gunzip -f /tmp/zoop-cloud.gz
   sudo systemctl stop zoop-cloud
   sudo mv /tmp/zoop-cloud /opt/zoop/bin/zoop-cloud
   sudo chmod +x /opt/zoop/bin/zoop-cloud
   sudo systemctl start zoop-cloud
   sudo systemctl status zoop-cloud --no-pager
   EOF
   ```
4. Verify health:
   ```bash
   curl -s -I https://3.70.135.200.sslip.io/metrics
   ```

### Playbook 2: Deploying a Frontend Update to Cloudflare Pages
When you modify frontend code in `web/`:

1. Build production assets:
   ```bash
   cd web
   npm run build
   cd ..
   ```
2. Deploy via Wrangler:
   ```bash
   tar -czf /tmp/web-dist.tar.gz -C web dist
   scp -i ~/.ssh/zoop-key.pem /tmp/web-dist.tar.gz ubuntu@3.70.135.200:/tmp/web-dist.tar.gz
   ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200 << 'EOF'
   rm -rf /tmp/dist
   tar -xzf /tmp/web-dist.tar.gz -C /tmp
   CLOUDFLARE_API_TOKEN="<YOUR_CLOUDFLARE_API_TOKEN>" \
   CLOUDFLARE_ACCOUNT_ID="7335973a10147fee3168dac18331dbab" \
   npx wrangler pages deploy /tmp/dist --project-name zoopnetwork --branch main --commit-dirty=true
   EOF
   ```
3. Verify live URL:
   ```bash
   curl -s -I https://zoopnetwork.pages.dev
   ```

### Playbook 3: Inspecting Server Logs & Diagnostics
```bash
# Follow live backend logs
ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200 "sudo journalctl -u zoop-cloud -f"

# Check memory and swap usage
ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200 "free -h"

# Inspect Caddy TLS and access logs
ssh -i ~/.ssh/zoop-key.pem ubuntu@3.70.135.200 "sudo journalctl -u caddy -n 50 --no-pager"
```

---

## 5. Porting to Alternative Clouds (GCP, Hetzner, Bare Metal)

If you migrate from AWS to another provider:
1. Spin up any Ubuntu 22.04 or 24.04 server (even a $3-4/month VPS on Hetzner or DigitalOcean).
2. Set up a 2GB swap file (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`).
3. Install Caddy (`apt install -y caddy`) and Coturn (`apt install -y coturn`).
4. Copy `zoop-cloud` to `/opt/zoop/bin/` and configure `/opt/zoop/.env` with your Neon database URL.
5. Point your domain (e.g. `api.zoop.network`) via an A record to the new server's public IP.
6. Caddy will automatically issue a new TLS certificate for your domain on first request.
