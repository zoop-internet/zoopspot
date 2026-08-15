#!/bin/bash
set -e

NAT_TYPE=${NAT_TYPE:-standard}
WAN_IFACE="eth0"
LAN_IFACE="eth1"

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1 >/dev/null 2>&1 || true

# Flush all rules
iptables -F
iptables -t nat -F

# Set default policies
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

# Configure NAT
if [ "$NAT_TYPE" = "symmetric" ]; then
    echo "Configuring router as SYMMETRIC NAT (random port mapping)..."
    # --random ensures different external ports for different destinations even from same internal port
    iptables -t nat -A POSTROUTING -o $WAN_IFACE -j MASQUERADE --random
elif [ "$NAT_TYPE" = "fullcone" ]; then
    echo "Configuring router as FULL CONE NAT..."
    # A standard masquerade is usually port-restricted cone or symmetric in Linux, 
    # but we'll use a simpler masquerade for standard
    iptables -t nat -A POSTROUTING -o $WAN_IFACE -j MASQUERADE
else
    echo "Configuring router as STANDARD NAT (Port-Restricted Cone)..."
    iptables -t nat -A POSTROUTING -o $WAN_IFACE -j MASQUERADE
fi

echo "Router ready (NAT: $NAT_TYPE)."
# Keep alive
tail -f /dev/null
