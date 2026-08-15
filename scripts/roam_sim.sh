#!/bin/bash
# scripts/roam_sim.sh
# Usage: ./scripts/roam_sim.sh <container_name> <old_network> <new_network> <new_ip>

CONTAINER=$1
OLD_NET=$2
NEW_NET=$3
NEW_IP=$4

if [ -z "$NEW_IP" ]; then
    echo "Usage: $0 <container_name> <old_network> <new_network> <new_ip>"
    exit 1
fi

echo "Simulating roaming for $CONTAINER..."
echo "Disconnecting from $OLD_NET..."
docker network disconnect $OLD_NET $CONTAINER || true

echo "Connecting to $NEW_NET with IP $NEW_IP..."
docker network connect --ip $NEW_IP $NEW_NET $CONTAINER

echo "Roaming simulation complete."
