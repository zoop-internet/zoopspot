#!/bin/bash
ip link add dev wg0 type wireguard
ip link add dev wg1 type wireguard
ip address add dev wg0 100.64.0.1/24
ip address add dev wg1 100.64.0.2/24
ip link set up dev wg0
ip link set up dev wg1
wg genkey | tee wg0.priv | wg pubkey > wg0.pub
wg genkey | tee wg1.priv | wg pubkey > wg1.pub
wg set wg0 private-key wg0.priv listen-port 51820 peer $(cat wg1.pub) allowed-ips 100.64.0.2/32 endpoint 127.0.0.1:51821
wg set wg1 private-key wg1.priv listen-port 51821 peer $(cat wg0.pub) allowed-ips 100.64.0.1/32 endpoint 127.0.0.1:51820
curl --interface wg1 --max-time 2 http://100.64.0.1:8000/
