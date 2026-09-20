#!/usr/bin/env bash
# ==============================================================================
# Zoop Provider Gateway Setup & Teardown
#
# Configures the Linux host as the Internet-Sharing Gateway for real Android
# phone testing:
#   1. Enables IPv4/IPv6 packet forwarding in kernel
#   2. Configures iptables FORWARD, TCPMSS clamping, and NAT MASQUERADE
#   3. Starts or verifies the zoopd system daemon
#   4. Prints LAN candidate IP, WireGuard public key, and pairing details
#
# Usage:
#   sudo ./setup_provider_gateway.sh [options]
#
# Options:
#   -i, --interface <name>   TUN interface name (default: zoop0)
#   -p, --port <port>        WireGuard listen port (default: 51820)
#   -w, --wan <interface>    Host WAN interface (auto-detected if omitted)
#   --teardown               Remove NAT rules and restore host forwarding state
#   -h, --help               Show this help message
# ==============================================================================

set -euo pipefail

TUN_IF="zoop0"
WG_PORT=51820
WAN_IF=""
TEARDOWN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--interface)
      TUN_IF="$2"
      shift 2
      ;;
    -p|--port)
      WG_PORT="$2"
      shift 2
      ;;
    -w|--wan)
      WAN_IF="$2"
      shift 2
      ;;
    --teardown)
      TEARDOWN=true
      shift
      ;;
    -h|--help)
      sed -ne '/^#/!q;s/^# //;p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: This script requires root privileges to configure network forwarding and iptables."
  echo "Please run: sudo $0 $*"
  exit 1
fi

# Auto-detect WAN interface if unset
if [ -z "$WAN_IF" ]; then
  WAN_IF=$(ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
  if [ -z "$WAN_IF" ]; then
    WAN_IF="eth0"
  fi
fi

if [ "$TEARDOWN" = true ]; then
  echo "=== Teardown Zoop Provider Gateway ==="
  echo "Removing iptables rules for ${TUN_IF}..."
  iptables -t nat -D POSTROUTING -s 100.64.0.0/10 ! -o "$TUN_IF" -j MASQUERADE 2>/dev/null || true
  iptables -D FORWARD -i "$TUN_IF" ! -o "$TUN_IF" -j ACCEPT 2>/dev/null || true
  iptables -D FORWARD -o "$TUN_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
  iptables -D FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu 2>/dev/null || true
  echo "✓ Gateway iptables rules removed."
  exit 0
fi

echo "============================================================"
echo "         ZOOP PROVIDER GATEWAY SETUP & CONFIGURATION        "
echo "============================================================"
echo "TUN Interface:  ${TUN_IF}"
echo "WAN Interface:  ${WAN_IF}"
echo "WireGuard Port: ${WG_PORT}"
echo "Overlay Subnet: 100.64.0.0/10"
echo "------------------------------------------------------------"

# 1. Enable IPv4 and IPv6 kernel packet forwarding
echo "[1/4] Enabling Linux kernel packet forwarding..."
sysctl -w net.ipv4.ip_forward=1 >/dev/null
sysctl -w net.ipv4.conf.all.forwarding=1 >/dev/null
sysctl -w net.ipv4.conf.default.forwarding=1 >/dev/null
echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true

# Disable reverse path filtering to allow multi-interface asymmetric routing
sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
sysctl -w "net.ipv4.conf.${WAN_IF}.rp_filter=0" >/dev/null 2>&1 || true

echo "✓ Kernel IP forwarding active: $(cat /proc/sys/net/ipv4/ip_forward)"

# 2. Configure iptables FORWARD & NAT MASQUERADE
echo "[2/4] Configuring iptables forwarding and NAT MASQUERADE..."
iptables -P FORWARD ACCEPT

# TCPMSS clamping to prevent packet fragmentation over MTU 1420
if ! iptables -C FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu 2>/dev/null; then
  iptables -I FORWARD 1 -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
fi

# NAT MASQUERADE for 100.64.0.0/10 exiting any physical interface
if ! iptables -t nat -C POSTROUTING -s 100.64.0.0/10 ! -o "$TUN_IF" -j MASQUERADE 2>/dev/null; then
  iptables -t nat -A POSTROUTING -s 100.64.0.0/10 ! -o "$TUN_IF" -j MASQUERADE
fi

# Allow forwarding from TUN to WAN
if ! iptables -C FORWARD -i "$TUN_IF" ! -o "$TUN_IF" -j ACCEPT 2>/dev/null; then
  iptables -I FORWARD 1 -i "$TUN_IF" ! -o "$TUN_IF" -j ACCEPT
fi

# Allow established/related return traffic from WAN to TUN
if ! iptables -C FORWARD -o "$TUN_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null; then
  iptables -I FORWARD 1 -o "$TUN_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
fi

echo "✓ iptables NAT rules configured."

# 3. Start or check zoopd daemon
echo "[3/4] Checking zoopd system service..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if pgrep -f "zoopd" >/dev/null 2>&1; then
  echo "✓ zoopd is already running."
else
  echo "Starting zoopd in background..."
  if [ -f "${REPO_ROOT}/bin/zoopd" ]; then
    nohup "${REPO_ROOT}/bin/zoopd" -tun "$TUN_IF" -api-port 9090 > /tmp/zoopd-gateway.log 2>&1 &
    sleep 2
    echo "✓ zoopd started (PID $!, log: /tmp/zoopd-gateway.log)"
  else
    echo "Building zoopd..."
    (cd "$REPO_ROOT" && go build -o bin/zoopd ./cmd/zoopd)
    nohup "${REPO_ROOT}/bin/zoopd" -tun "$TUN_IF" -api-port 9090 > /tmp/zoopd-gateway.log 2>&1 &
    sleep 2
    echo "✓ zoopd built and started (PID $!, log: /tmp/zoopd-gateway.log)"
  fi
fi

# 4. Print provider details for pairing
echo "[4/4] Provider Gateway Ready!"
HOST_LAN_IP=$(ip -brief addr show 2>/dev/null | grep -v "127.0.0.1" | grep -v "100.64." | grep -E "192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\." | awk '{print $3}' | cut -d/ -f1 | head -n 1)

echo "------------------------------------------------------------"
echo "  Provider Host LAN IP:   ${HOST_LAN_IP:-unknown}"
echo "  WireGuard Port:         ${WG_PORT}"
echo "  Provider Overlay IP:    100.64.0.1"
echo "  Client Overlay IP:      100.64.0.2"

if [ -f "/tmp/zoopd.sock" ] || [ -f "/var/run/zoopd.sock" ]; then
  STATUS_OUT=$("${REPO_ROOT}/bin/zoop" status 2>/dev/null || true)
  echo "  Daemon Status:          ${STATUS_OUT}"
fi
echo "------------------------------------------------------------"
echo "Next: Run ./test/android-harness/diagnose_chain.sh to test connectivity."
