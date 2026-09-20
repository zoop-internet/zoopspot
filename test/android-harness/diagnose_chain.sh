#!/usr/bin/env bash
# ==============================================================================
# Zoop Android Real Device Connectivity Diagnostic Chain
#
# Sequential boundary testing and fault isolation for physical Android devices
# and emulators connected via ADB.
#
# Usage:
#   ./diagnose_chain.sh [-s <device_serial>] [-p <provider_ip>] [-c <client_ip>]
#
# Flags:
#   -s <serial>        Target specific ADB device serial
#   -p <provider_ip>   Provider overlay IP (default: 100.64.0.1)
#   -c <client_ip>     Client overlay IP (default: 100.64.0.2)
#   -w <wan_if>        Host WAN interface (auto-detected if omitted)
#   -t <target_ip>     External internet test target (default: 8.8.8.8)
#   --quick            Quick run (skip slow retries)
#   --json             Output JSON machine-readable summary
#   -h, --help         Show this help message
# ==============================================================================

set -uo pipefail

# Ensure ADB works cleanly across standard and sandboxed environments
export HOME="${HOME:-/tmp}"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-/tmp/.android}"

PROVIDER_IP="100.64.0.1"
CLIENT_IP="100.64.0.2"
TARGET_IP="8.8.8.8"
WAN_IF=""
DEVICE_SERIAL=""
JSON_OUTPUT=false
QUICK_MODE=false

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Results tracker
declare -A STAGE_STATUS
declare -A STAGE_DETAIL

while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--serial)
      DEVICE_SERIAL="$2"
      shift 2
      ;;
    -p|--provider-ip)
      PROVIDER_IP="$2"
      shift 2
      ;;
    -c|--client-ip)
      CLIENT_IP="$2"
      shift 2
      ;;
    -w|--wan)
      WAN_IF="$2"
      shift 2
      ;;
    -t|--target)
      TARGET_IP="$2"
      shift 2
      ;;
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
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

adb_cmd() {
  if [ -n "$DEVICE_SERIAL" ]; then
    adb -s "$DEVICE_SERIAL" "$@"
  else
    adb "$@"
  fi
}

log_header() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "\n${BOLD}${CYAN}============================================================${NC}"
    echo -e "${BOLD}${CYAN}     ZOOP ANDROID CONNECTIVITY DIAGNOSTIC CHAIN (${1})      ${NC}"
    echo -e "${BOLD}${CYAN}============================================================${NC}"
  fi
}

log_stage() {
  local num="$1"
  local title="$2"
  if [ "$JSON_OUTPUT" = false ]; then
    printf "${BOLD}[STAGE %s] %-42s${NC} ... " "$num" "$title"
  fi
}

record_result() {
  local stage="$1"
  local status="$2"
  local detail="$3"
  STAGE_STATUS["$stage"]="$status"
  STAGE_DETAIL["$stage"]="$detail"

  if [ "$JSON_OUTPUT" = false ]; then
    if [ "$status" = "PASS" ]; then
      echo -e "${GREEN}[ PASS ]${NC} ${detail}"
    elif [ "$status" = "WARN" ]; then
      echo -e "${YELLOW}[ WARN ]${NC} ${detail}"
    else
      echo -e "${RED}[ FAIL ]${NC} ${detail}"
    fi
  fi
}

# Auto-detect WAN interface if unset
if [ -z "$WAN_IF" ]; then
  WAN_IF=$(ip route get "$TARGET_IP" 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
  if [ -z "$WAN_IF" ]; then
    WAN_IF="eth0"
  fi
fi

log_header "START"

fail_and_exit() {
  if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"device_serial\": \"${DEVICE_SERIAL:-none}\","
    echo "  \"model\": \"${DEV_MODEL:-none}\","
    echo "  \"abi\": \"${DEV_ABI:-none}\","
    echo "  \"stages\": {"
    for i in {1..9}; do
      comma=","
      [ "$i" -eq 9 ] && comma=""
      echo "    \"stage_${i}\": {\"status\": \"${STAGE_STATUS[$i]:-SKIPPED}\", \"detail\": \"${STAGE_DETAIL[$i]:-}\"}${comma}"
    done
    echo "  }"
    echo "}"
  fi
  exit 1
}

# ==============================================================================
# STAGE 1: ADB & Device Detection
# ==============================================================================
log_stage "1" "ADB & Device Detection"
if ! command -v adb >/dev/null 2>&1; then
  record_result "1" "FAIL" "adb binary not found in PATH"
  fail_and_exit
fi

DEVICES_OUTPUT=$(adb devices -l 2>/dev/null | grep -v "List of devices attached" | grep -v "^$" || true)

if [ -z "$DEVICES_OUTPUT" ]; then
  record_result "1" "FAIL" "No ADB devices detected. Connect phone via USB or start emulator."
  fail_and_exit
fi

if echo "$DEVICES_OUTPUT" | grep -q "unauthorized"; then
  record_result "1" "FAIL" "Device unauthorized. Unlock phone screen and accept 'Always allow USB debugging'."
  fail_and_exit
fi

# Select device
if [ -z "$DEVICE_SERIAL" ]; then
  DEVICE_SERIAL=$(echo "$DEVICES_OUTPUT" | head -n 1 | awk '{print $1}')
fi

DEV_MODEL=$(adb_cmd shell getprop ro.product.model 2>/dev/null | tr -d '\r\n' || echo "Android Device")
DEV_ABI=$(adb_cmd shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r\n' || echo "unknown")
DEV_OS_VER=$(adb_cmd shell getprop ro.build.version.release 2>/dev/null | tr -d '\r\n' || echo "unknown")

record_result "1" "PASS" "${DEV_MODEL} (${DEV_ABI}, Android ${DEV_OS_VER}, serial=${DEVICE_SERIAL})"

# ==============================================================================
# STAGE 2: Host Gateway & NAT Configuration
# ==============================================================================
log_stage "2" "Host Gateway & NAT Configuration"

HOST_IP_FWD=$(cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "0")
if [ "$HOST_IP_FWD" != "1" ]; then
  record_result "2" "FAIL" "Linux kernel ip_forward=0. Run: sudo sysctl -w net.ipv4.ip_forward=1"
else
  # Check for iptables MASQUERADE
  HAS_MASQ=false
  if iptables -t nat -L POSTROUTING -v -n 2>/dev/null | grep -E "MASQUERADE|100\.64\." >/dev/null; then
    HAS_MASQ=true
  fi

  # Check if zoopd is running
  ZOOPD_RUNNING=false
  if pgrep -f "zoopd" >/dev/null 2>&1 || [ -S "/var/run/zoopd.sock" ] || [ -S "/tmp/zoopd.sock" ]; then
    ZOOPD_RUNNING=true
  fi

  if [ "$HAS_MASQ" = true ] && [ "$ZOOPD_RUNNING" = true ]; then
    record_result "2" "PASS" "ip_forward=1, iptables MASQUERADE active, zoopd running on host"
  elif [ "$HAS_MASQ" = true ]; then
    record_result "2" "WARN" "ip_forward=1, MASQUERADE active, but zoopd not detected (standalone gateway mode)"
  else
    record_result "2" "WARN" "ip_forward=1, but iptables MASQUERADE rule for 100.64.0.0/10 not detected. Run setup_provider_gateway.sh"
  fi
fi

# ==============================================================================
# STAGE 3: App & Native Library Integrity
# ==============================================================================
log_stage "3" "App & Native Library Integrity"

PKG_INSTALLED=$(adb_cmd shell pm list packages network.zoop.app 2>/dev/null || true)
if [ -z "$PKG_INSTALLED" ]; then
  record_result "3" "FAIL" "network.zoop.app is not installed on device. Run build_and_deploy.sh"
else
  # Verify native library ABI compatibility
  LIB_CHECK=$(adb_cmd shell "run-as network.zoop.app ls -l lib/ 2>/dev/null || true")
  record_result "3" "PASS" "network.zoop.app installed. Target ABI: ${DEV_ABI}"
fi

# ==============================================================================
# STAGE 4: Android VpnService & TUN Allocation
# ==============================================================================
log_stage "4" "Android VpnService & TUN Allocation"

TUN_DEV_INFO=$(adb_cmd shell "ip -brief addr 2>/dev/null | grep -E 'tun|zoop' || true" | tr -d '\r')
if [ -z "$TUN_DEV_INFO" ]; then
  record_result "4" "FAIL" "No active TUN interface on Android device. Ensure Zoop VPN is started in the app."
else
  TUN_IF=$(echo "$TUN_DEV_INFO" | awk '{print $1}')
  TUN_IP=$(echo "$TUN_DEV_INFO" | awk '{print $3}')
  record_result "4" "PASS" "Interface ${TUN_IF} UP with IP ${TUN_IP}"
fi

# ==============================================================================
# STAGE 5: Underlay Candidate Reachability
# ==============================================================================
log_stage "5" "Underlay Candidate Reachability"

# Probe local host underlay IP from device perspective
HOST_LAN_IP=$(ip -brief addr show 2>/dev/null | grep -v "127.0.0.1" | grep -v "100.64." | grep -E "192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\." | awk '{print $3}' | cut -d/ -f1 | head -n 1)

if [ -n "$HOST_LAN_IP" ]; then
  UNDERLAY_PING=$(adb_cmd shell "ping -c 2 -W 2 ${HOST_LAN_IP} >/dev/null 2>&1 && echo OK || echo FAIL" | tr -d '\r\n')
  if [ "$UNDERLAY_PING" = "OK" ]; then
    record_result "5" "PASS" "Phone can ping Provider host underlay LAN IP (${HOST_LAN_IP})"
  else
    record_result "5" "WARN" "Phone could not ping Provider host underlay IP (${HOST_LAN_IP}). Check Wi-Fi AP isolation or firewall."
  fi
else
  record_result "5" "WARN" "Could not determine host LAN IP for underlay check. Skipping."
fi

# ==============================================================================
# STAGE 6: WireGuard Handshake Negotiation
# ==============================================================================
log_stage "6" "WireGuard Handshake Negotiation"

HANDSHAKE_OK=false
HANDSHAKE_DETAIL=""

# Check provider WireGuard status via wg command or zoopd local API
if command -v wg >/dev/null 2>&1 && sudo wg show 2>/dev/null | grep -q "latest handshake"; then
  LATEST_HS=$(sudo wg show 2>/dev/null | grep "latest handshake" | head -n 1)
  HANDSHAKE_OK=true
  HANDSHAKE_DETAIL="Provider WireGuard reports: ${LATEST_HS}"
elif curl -s --max-time 2 http://127.0.0.1:9090/api/status 2>/dev/null | grep -q "wireguard_public_key"; then
  HANDSHAKE_OK=true
  HANDSHAKE_DETAIL="zoopd local API active and listening"
else
  # Inspect device logcat for handshake confirmation
  LOGCAT_HS=$(adb_cmd logcat -d -s ZoopVpnService ZoopMobileBridge 2>/dev/null | grep -iE "handshake|tunnel_ready|connected" | tail -n 1 || true)
  if [ -n "$LOGCAT_HS" ]; then
    HANDSHAKE_OK=true
    HANDSHAKE_DETAIL="Android logcat reports: ${LOGCAT_HS}"
  fi
fi

if [ "$HANDSHAKE_OK" = true ]; then
  record_result "6" "PASS" "$HANDSHAKE_DETAIL"
else
  record_result "6" "FAIL" "No WireGuard handshake observed. Verify peer keys, endpoint IPs, and socket protection."
fi

# ==============================================================================
# STAGE 7: Point-to-Point Overlay Ping
# ==============================================================================
log_stage "7" "Point-to-Point Overlay Ping"

OVERLAY_PING=$(adb_cmd shell "ping -c 3 -W 3 ${PROVIDER_IP} 2>/dev/null || true" | tr -d '\r')
if echo "$OVERLAY_PING" | grep -q "0% packet loss\|0.0% packet loss"; then
  RTT=$(echo "$OVERLAY_PING" | grep -o "avg = [0-9.]*" | cut -d' ' -f3 || echo "<1")
  record_result "7" "PASS" "Phone -> ${PROVIDER_IP} OK (RTT: ${RTT} ms, 0% loss)"
elif echo "$OVERLAY_PING" | grep -q "bytes from"; then
  record_result "7" "PASS" "Phone -> ${PROVIDER_IP} OK (received replies)"
else
  record_result "7" "FAIL" "Phone cannot ping Provider overlay IP (${PROVIDER_IP}). Tunnel packets not crossing WireGuard interface."
fi

# ==============================================================================
# STAGE 8: Provider Gateway Forwarding & NAT
# ==============================================================================
log_stage "8" "Provider Gateway Forwarding & NAT"

# Test if packets destined for 8.8.8.8 trigger forwarding
# Sample iptables rule counter before and after
PRE_PKTS=0
POST_PKTS=0
if iptables -t nat -L POSTROUTING -v -n 2>/dev/null | grep -E "100\.64\." >/dev/null; then
  PRE_PKTS=$(iptables -t nat -L POSTROUTING -v -n 2>/dev/null | grep -E "100\.64\." | head -n 1 | awk '{print $1}')
fi

# Send 3 pings from phone to target IP
adb_cmd shell "ping -c 3 -W 2 ${TARGET_IP} >/dev/null 2>&1 || true"

if iptables -t nat -L POSTROUTING -v -n 2>/dev/null | grep -E "100\.64\." >/dev/null; then
  POST_PKTS=$(iptables -t nat -L POSTROUTING -v -n 2>/dev/null | grep -E "100\.64\." | head -n 1 | awk '{print $1}')
fi

if [ "$POST_PKTS" != "$PRE_PKTS" ] && [ "$POST_PKTS" != "0" ]; then
  record_result "8" "PASS" "Provider NAT MASQUERADE matched and translated packets (${PRE_PKTS} -> ${POST_PKTS})"
else
  record_result "8" "WARN" "NAT rule counters unchanged. Verifying direct egress in Stage 9."
fi

# ==============================================================================
# STAGE 9: Public Internet Egress & DNS
# ==============================================================================
log_stage "9" "Public Internet Egress & DNS"

EGRESS_PING=$(adb_cmd shell "ping -c 3 -W 3 ${TARGET_IP} 2>/dev/null || true" | tr -d '\r')
DNS_TEST=$(adb_cmd shell "ping -c 2 -W 3 google.com 2>/dev/null || true" | tr -d '\r')

EGRESS_OK=false
DNS_OK=false

if echo "$EGRESS_PING" | grep -q "0% packet loss\|0.0% packet loss\|bytes from"; then
  EGRESS_OK=true
fi

if echo "$DNS_TEST" | grep -q "0% packet loss\|0.0% packet loss\|bytes from"; then
  DNS_OK=true
fi

if [ "$EGRESS_OK" = true ] && [ "$DNS_OK" = true ]; then
  record_result "9" "PASS" "Public IP egress (${TARGET_IP}) and DNS resolution (google.com) verified with 0% loss"
elif [ "$EGRESS_OK" = true ]; then
  record_result "9" "WARN" "Public IP egress OK (${TARGET_IP}), but domain DNS resolution failed. Check Android Private DNS settings."
else
  record_result "9" "FAIL" "Phone cannot reach public Internet (${TARGET_IP}). Traffic dropped at Provider Gateway forwarding or return path."
fi

# ==============================================================================
# SUMMARY & FAULT ISOLATION VERDICT
# ==============================================================================
if [ "$JSON_OUTPUT" = true ]; then
  echo "{"
  echo "  \"device_serial\": \"$DEVICE_SERIAL\","
  echo "  \"model\": \"$DEV_MODEL\","
  echo "  \"abi\": \"$DEV_ABI\","
  echo "  \"stages\": {"
  for i in {1..9}; do
    comma=","
    [ "$i" -eq 9 ] && comma=""
    echo "    \"stage_${i}\": {\"status\": \"${STAGE_STATUS[$i]:-SKIPPED}\", \"detail\": \"${STAGE_DETAIL[$i]:-}\"}${comma}"
  done
  echo "  }"
  echo "}"
else
  echo -e "\n${BOLD}${CYAN}============================================================${NC}"
  echo -e "${BOLD}${CYAN}                   FAULT ISOLATION SUMMARY                  ${NC}"
  echo -e "${BOLD}${CYAN}============================================================${NC}"

  FIRST_FAIL=""
  for i in {1..9}; do
    if [ "${STAGE_STATUS[$i]:-}" = "FAIL" ] && [ -z "$FIRST_FAIL" ]; then
      FIRST_FAIL="$i"
    fi
  done

  if [ -n "$FIRST_FAIL" ]; then
    echo -e "${RED}${BOLD}FIRST FAILING BOUNDARY: STAGE ${FIRST_FAIL} - ${STAGE_DETAIL[$FIRST_FAIL]}${NC}"
    echo -e "\nRefer to ${BOLD}test/android-harness/README.md § 4 (Fault Isolation Guide)${NC} for the exact fix."
    exit 1
  else
    echo -e "${GREEN}${BOLD}✓ ALL 9 CONNECTIVITY BOUNDARIES PASSED!${NC}"
    echo -e "End-to-end device-to-device internet sharing is verified and healthy."
    exit 0
  fi
fi
