#!/usr/bin/env bash
# ==============================================================================
# Zoop Multi-Boundary Traffic Sniffer
#
# Monitors packets simultaneously across the WireGuard tunnel interface (zoop0)
# and the host WAN interface (eth0/wlan0) to observe real-time forwarding,
# NAT MASQUERADE, and return traffic.
#
# Usage:
#   sudo ./capture_traffic.sh [-i <tun_interface>] [-w <wan_interface>]
# ==============================================================================

set -euo pipefail

TUN_IF="zoop0"
WAN_IF=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--interface)
      TUN_IF="$2"
      shift 2
      ;;
    -w|--wan)
      WAN_IF="$2"
      shift 2
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
  echo "Error: This script requires root privileges to capture packets."
  echo "Please run: sudo $0 $*"
  exit 1
fi

if [ -z "$WAN_IF" ]; then
  WAN_IF=$(ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
  if [ -z "$WAN_IF" ]; then
    WAN_IF="eth0"
  fi
fi

if ! command -v tcpdump >/dev/null 2>&1; then
  echo "Error: tcpdump is required for packet capture. Please install tcpdump."
  exit 1
fi

echo "============================================================"
echo "         ZOOP MULTI-BOUNDARY PACKET CAPTURE                "
echo "============================================================"
echo "Listening on:"
echo "  [1] Tunnel Interface: ${TUN_IF} (Decrypted overlay traffic: 100.64.0.0/10)"
echo "  [2] WAN Interface:    ${WAN_IF} (Encrypted WG UDP 51820 & NAT Egress)"
echo "Press Ctrl+C to stop."
echo "------------------------------------------------------------"

trap 'kill $(jobs -p) 2>/dev/null || true; echo -e "\nStopped capture."; exit 0' SIGINT SIGTERM

# Capture on Tunnel Interface
tcpdump -n -i "$TUN_IF" -l 2>/dev/null | sed -e "s/^/[TUNNEL: ${TUN_IF}] /" &

# Capture on WAN Interface (filter for WG port 51820 or ICMP/DNS from CGNAT or target 8.8.8.8/1.1.1.1)
tcpdump -n -i "$WAN_IF" "udp port 51820 or icmp or host 8.8.8.8 or host 1.1.1.1" -l 2>/dev/null | sed -e "s/^/[WAN: ${WAN_IF}] /" &

wait
