# Zoop Android Real Device Connectivity Test Harness

A dedicated, fault-isolating test harness for verifying end-to-end internet sharing between a **physical Android phone** (or Android emulator) and a **Zoop Linux Provider Gateway**.

---

## 1. The Connectivity Chain & Fault Isolation Model

Zoop internet sharing operates as a strict multi-boundary chain. When internet sharing fails, **do not guess**—the harness tests each boundary sequentially to isolate the exact point of failure:

```text
Boundary 1: [Host & ADB State]       ── Device connected, authorized, host gateway ready
Boundary 2: [Provider Gateway]       ── zoopd running, net.ipv4.ip_forward=1, iptables MASQUERADE active
Boundary 3: [App & Native Core]      ── network.zoop.app installed, libzoop.so loaded for device ABI
Boundary 4: [Android VpnService]     ── tun0 allocated, 100.64.0.2 assigned, UDP socket protected (anti-loop)
Boundary 5: [Underlay Reachability]  ── Phone can reach Provider LAN/STUN IP over UDP (Port 51820)
Boundary 6: [WireGuard Handshake]    ── Curve25519 handshake completed (recent handshake < 120s)
Boundary 7: [Overlay Point-to-Point] ── Phone can ping Provider overlay IP (100.64.0.1) across tunnel
Boundary 8: [Gateway Forwarding/NAT] ── Provider forwards packets from zoop0 to WAN with MASQUERADE
Boundary 9: [Public Egress & Return] ── Phone can ping 8.8.8.8, fetch HTTPS 1.1.1.1, and resolve DNS
```

---

## 2. Prerequisites & Physical Device Setup

### A. Physical Device via USB ADB
1. Enable **Developer Options** and **USB Debugging** on the Android phone.
2. Connect the phone to the host via USB cable.
3. Verify ADB detection (in sandboxed environments, pass `HOME=/tmp`):
   ```bash
   HOME=/tmp adb devices -l
   ```
4. If unauthorized, unlock the phone screen and tap **"Always allow from this computer"**.
5. Ensure the phone is on the **same Wi-Fi / LAN network** as the Linux host, or connected via USB tethering. Note the host's LAN IP (e.g. `192.168.1.50` or `192.168.42.x`).

### B. Physical Device via Wireless ADB (Optional)
If USB is inconvenient:
```bash
# While connected via USB once:
HOME=/tmp adb tcpip 5555
# Disconnect USB, then connect over Wi-Fi:
HOME=/tmp adb connect <PHONE_WIFI_IP>:5555
```

### C. Emulator Comparison Baseline
To compare behavior with the known working emulator setup:
```bash
./scripts/launch_emulator.sh
```

---

## 3. Quick Start: The 3-Step Test Workflow

### Step 1: Start the Provider Gateway on the Host
Configure the Linux host to act as the internet-sharing gateway:
```bash
sudo ./test/android-harness/setup_provider_gateway.sh
```
This script:
- Enables Linux kernel packet forwarding (`net.ipv4.ip_forward=1`)
- Configures `iptables` NAT MASQUERADE and TCPMSS clamping for `100.64.0.0/10`
- Starts `zoopd` on interface `zoop0` (or `zoopa`)
- Prints the Provider's WireGuard public key and LAN candidate IP:port

### Step 2: Build and Deploy the Android App
Build `libzoop.so` and the APK, install it onto the phone, and launch it:
```bash
./test/android-harness/build_and_deploy.sh
```
*(Optionally pass device serial if multiple devices are connected: `./build_and_deploy.sh -s <SERIAL>`)*

### Step 3: Run the Connectivity Diagnostic Chain
Run the automated fault-isolation probe:
```bash
./test/android-harness/diagnose_chain.sh
```

The script tests all 9 boundaries and outputs a clear diagnostic matrix:

```text
============================================================
           ZOOP ANDROID CONNECTIVITY DIAGNOSTIC CHAIN        
============================================================
[STAGE 1] ADB & Device Detection ............. [ PASS ] (Pixel 7 / arm64-v8a)
[STAGE 2] Host Gateway & NAT Configuration ... [ PASS ] (ip_forward=1, MASQUERADE active)
[STAGE 3] App & Native Library Integrity ..... [ PASS ] (network.zoop.app, libzoop.so verified)
[STAGE 4] VpnService & TUN Allocation ........ [ PASS ] (tun0 up, 100.64.0.2/32 assigned)
[STAGE 5] Underlay Candidate Reachability .... [ PASS ] (192.168.1.50:51820 reachable via UDP)
[STAGE 6] WireGuard Handshake Negotiation .... [ PASS ] (Handshake 14s ago, RTT: 0.8ms)
[STAGE 7] Point-to-Point Overlay Ping ........ [ PASS ] (100.64.0.1 reachable, 0% loss)
[STAGE 8] Provider Gateway Forwarding & NAT .. [ PASS ] (zoop0 -> eth0 MASQUERADE counters incrementing)
[STAGE 9] Public Internet Egress & DNS ....... [ PASS ] (8.8.8.8 OK, https://1.1.1.1 OK, DNS OK)
============================================================
RESULT: ALL BOUNDARIES PASS — REAL CONNECTIVITY VERIFIED
============================================================
```

---

## 4. Fault Isolation Guide (Where Traffic Stops)

When a failure occurs, `diagnose_chain.sh` halts at the first failing stage and outputs actionable guidance. Use this reference matrix:

| Failing Stage | Symptom | Probable Root Cause | Actionable Fix |
|---|---|---|---|
| **Stage 1** | ADB device not found / unauthorized | USB debugging disabled or unauthorized prompt on phone screen | Unlock phone, accept prompt. Ensure `HOME=/tmp adb devices` sees device. |
| **Stage 2** | `ip_forward=0` or missing MASQUERADE | Host Linux kernel not forwarding packets | Run `sudo ./test/android-harness/setup_provider_gateway.sh` or `sudo sysctl -w net.ipv4.ip_forward=1`. |
| **Stage 3** | App crashes or `UnsatisfiedLinkError` | Architecture mismatch (`arm64-v8a` vs `x86_64`) or missing `libzoop.so` | Rebuild native core: `make mobile-cshared` or check `mobile/android/app/src/main/jniLibs/arm64-v8a/libzoop.so`. |
| **Stage 4** | `tun0` not listed in `ip addr` on phone | VPN permission not granted or `VpnService.prepare()` failed | Open app manually once to approve Android VPN dialog ("Connection request" prompt). |
| **Stage 5** | UDP packet dropped to Provider IP:51820 | Host firewall (UFW/iptables) blocking UDP port 51820 | Run `sudo ufw allow 51820/udp` or check LAN Wi-Fi AP client-isolation. |
| **Stage 6** | No WireGuard handshake timestamp | Mismatched Curve25519 keys, wrong endpoint, or socket routing loop | Check `logcat -s ZoopVpnService ZoopMobileBridge` for socket protect errors. Verify `VpnService.protect(fd)` was called on UDP socket. |
| **Stage 7** | Handshake succeeds but ping `100.64.0.1` fails | Overlay IP `100.64.0.1` not assigned to host TUN or wrong `allowed_ips` | Check provider TUN IP: `ip addr show zoop0`. Ensure allowed-ips on provider includes `100.64.0.2/32`. |
| **Stage 8** | Ping `100.64.0.1` works, but ping `8.8.8.8` fails; provider rx increments but WAN tx does not | Missing `iptables -t nat -A POSTROUTING -s 100.64.0.0/10 ! -o zoop0 -j MASQUERADE` or FORWARD policy DROP | Verify `iptables -L FORWARD -v -n` and `iptables -t nat -L POSTROUTING -v -n`. Run `setup_provider_gateway.sh`. |
| **Stage 9** | Ping `8.8.8.8` works, but web browsing / domain names fail | DNS server (`1.1.1.1`) blocked or Android Private DNS interference | Check `adb shell getprop net.dns1`. In Android Settings $\rightarrow$ Network $\rightarrow$ Private DNS, set to **Off** during test. |

---

## 5. Repeating the Test After Code Changes

When iterating on Go core (`packages/agent`, `packages/platform/mobile`, `cmd/zoop-mobile`) or Android Kotlin (`mobile/android`):

1. Edit your code.
2. Re-run:
   ```bash
   ./test/android-harness/build_and_deploy.sh --quick
   ./test/android-harness/diagnose_chain.sh
   ```
3. Read the output. The harness tells you immediately whether your change moved the failure boundary forward.

---

## 6. Inspecting Live Traffic (Packet Capture)

To watch packets cross the boundaries in real time:
```bash
# In a separate terminal:
sudo ./test/android-harness/capture_traffic.sh -i zoop0 -w eth0
```
This monitors:
- WireGuard encrypted UDP packets entering host WAN
- Decrypted IP packets appearing on `zoop0`
- Masqueraded packets leaving host WAN to `8.8.8.8`
- Return packets returning from `8.8.8.8` to `zoop0`
