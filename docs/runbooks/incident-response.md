# Zoop Incident Response Plan

This document outlines the standard operating procedures for responding to critical incidents in the Zoop Cloud Control Plane.

## Incident Severity Levels

*   **SEV-1 (Critical):** Complete control plane outage. Agents cannot authenticate, and new connections cannot be established. Existing tunnels *may* stay up due to P2P nature, but new peers cannot discover each other.
*   **SEV-2 (High):** Partial degradation. STUN/TURN relays are saturated causing connection failures for symmetric NAT clients, or API latency is severely elevated.
*   **SEV-3 (Medium):** Localized issues. Specific regions experiencing high latency, or non-critical background jobs failing.

## Core Triage Steps

### 1. Identify the Scope
*   Check Prometheus/Grafana dashboards:
    *   What is the API error rate (HTTP 5xx)?
    *   What is the active active tunnel count? Is it dropping rapidly?
    *   Are the `coturn` instances maxing out on CPU or bandwidth?

### 2. Common Failure Modes & Mitigations

#### A. PostgreSQL Database Exhaustion
*   **Symptoms:** High API latency, connections timing out, `too many clients already` errors in logs.
*   **Action:**
    1. Check `pg_stat_activity` for stuck queries.
    2. Temporarily increase `max_connections` or scale the RDS/CloudSQL instance.
    3. Restart the `zoop-cloud` pods to flush stale connection pools.

#### B. STUN/TURN (Coturn) Saturation
*   **Symptoms:** Devices behind strict Symmetric NATs are failing to connect (falling back to relay, but relay is slow or dropping packets).
*   **Action:**
    1. Immediately scale up the number of `coturn` instances or provision a larger instance size.
    2. Verify UDP port exhaustion is not occurring on the host NAT gateway.

#### C. Redis Cache Eviction / Crash
*   **Symptoms:** Signaling messages delayed or dropped. Agents rapidly disconnecting and reconnecting.
*   **Action:**
    1. Verify Redis memory usage. If OOM, scale the ElastiCache/Redis cluster.
    2. Since Redis stores ephemeral signaling data, a flush or restart will cause a momentary hiccup but clients will automatically re-register and heal.

### 3. Post-Mortem
Every SEV-1 and SEV-2 incident must be followed by a blameless post-mortem document detailing the root cause, timeline, and action items to prevent recurrence.
