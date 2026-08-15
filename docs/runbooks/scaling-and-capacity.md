# Zoop Scaling and Capacity Planning

This guide covers how to scale the Zoop ecosystem as the number of concurrent agents and tunnels grows.

## Component Scaling Vectors

### 1. Zoop Cloud API (Stateless)
*   **Vector:** Horizontal Scaling (more pods/containers).
*   **Trigger:** CPU utilization > 70% or Memory utilization > 80%.
*   **Action:** 
    *   Kubernetes (Helm): The HorizontalPodAutoscaler (HPA) configured in the Helm chart will automatically add replicas.
    *   Docker Compose: Manually increase replicas using `docker compose up --scale zoop-cloud=5 -d`.

### 2. Redis (Signaling/Caching)
*   **Vector:** Vertical Scaling (more memory) / Horizontal Scaling (Redis Cluster).
*   **Trigger:** High memory usage (Evictions occurring) or high CPU usage on the main thread.
*   **Action:**
    *   Because Zoop uses Redis for high-throughput pub/sub signaling, network bandwidth and CPU are often the bottleneck before memory.
    *   Upgrade to a compute-optimized instance type.
    *   If pub/sub throughput exceeds a single node, transition from standalone Redis to a sharded Redis Cluster.

### 3. PostgreSQL (Persistent Data)
*   **Vector:** Vertical Scaling (CPU/RAM) and Read Replicas.
*   **Trigger:** High active connections, slow query performance, or high disk I/O.
*   **Action:**
    *   Ensure connection pooling (e.g., PgBouncer) is enabled in front of the database if connection counts exceed 1,000.
    *   Scale the primary writer instance vertically (more CPU/RAM).
    *   Offload read-heavy dashboard/telemetry queries to read replicas.

### 4. STUN/TURN Relays (Coturn)
*   **Vector:** Horizontal Scaling (more VMs) + Geo-Distribution.
*   **Trigger:** Network bandwidth saturation or UDP packet drop on the host.
*   **Action:**
    *   Coturn scales horizontally perfectly. Add more instances behind a round-robin DNS record or Network Load Balancer.
    *   For global performance, deploy Coturn instances in multiple geographic regions (US, EU, Asia) and use Geo-DNS routing so clients connect to the nearest relay.

## Monitoring Baselines

When analyzing capacity, monitor these key metrics:
1.  **Concurrent Connected Agents:** (Tracked via Prometheus metrics).
2.  **Relay Bandwidth:** Gbps flowing through `coturn` instances.
3.  **Signaling Latency:** Time for an ICE candidate to traverse the API -> Redis -> API pipeline. Should remain < 50ms.
