#!/bin/bash
# scripts/net_sim.sh
# Usage: ./scripts/net_sim.sh <container_name> <interface> [delay <ms> | loss <%> | jitter <ms> | clear]

CONTAINER=$1
IFACE=$2
ACTION=$3
VAL=$4

if [ -z "$ACTION" ]; then
    echo "Usage: $0 <container_name> <interface> [delay <ms> | loss <%> | jitter <ms> | clear]"
    exit 1
fi

case "$ACTION" in
    clear)
        docker exec -u root $CONTAINER tc qdisc del dev $IFACE root 2>/dev/null || true
        echo "Cleared traffic control rules on $CONTAINER:$IFACE"
        ;;
    delay)
        docker exec -u root $CONTAINER tc qdisc del dev $IFACE root 2>/dev/null || true
        docker exec -u root $CONTAINER tc qdisc add dev $IFACE root netem delay ${VAL}ms
        echo "Added ${VAL}ms delay on $CONTAINER:$IFACE"
        ;;
    loss)
        docker exec -u root $CONTAINER tc qdisc del dev $IFACE root 2>/dev/null || true
        docker exec -u root $CONTAINER tc qdisc add dev $IFACE root netem loss ${VAL}%
        echo "Added ${VAL}% packet loss on $CONTAINER:$IFACE"
        ;;
    jitter)
        docker exec -u root $CONTAINER tc qdisc del dev $IFACE root 2>/dev/null || true
        # Apply delay with a random jitter (e.g. 50ms +- 20ms)
        # For simplicity, if they say 'jitter 20', we add 50ms delay with 20ms jitter
        docker exec -u root $CONTAINER tc qdisc add dev $IFACE root netem delay 50ms ${VAL}ms
        echo "Added 50ms delay with ${VAL}ms jitter on $CONTAINER:$IFACE"
        ;;
    *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
esac
