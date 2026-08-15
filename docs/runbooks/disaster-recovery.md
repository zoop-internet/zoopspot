# Zoop Disaster Recovery Plan

This runbook defines the procedures for recovering the Zoop Control Plane from a catastrophic failure, such as a complete regional cloud outage or severe data corruption.

## Recovery Time Objective (RTO) and Recovery Point Objective (RPO)
*   **RTO:** 4 Hours (Time to restore API services and signaling in a new region).
*   **RPO:** 24 Hours (Maximum acceptable data loss for organization/device configurations).

## Scenario 1: Primary Database Corruption

If the primary PostgreSQL database is corrupted by a bad migration or malicious action:

1.  **Stop all traffic:** Scale `zoop-cloud` deployments to 0 to prevent further corruption or confused clients.
2.  **Identify Snapshot:** Locate the most recent healthy RDS/CloudSQL automated snapshot prior to the incident.
3.  **Restore:** Provision a new database instance from the snapshot.
4.  **Reconfigure:** Update the Kubernetes Secrets (`zoop-cloud-secrets`) with the new database URL.
5.  **Resume:** Scale `zoop-cloud` deployments back up and monitor logs.

## Scenario 2: Complete Regional Cloud Outage

If the primary cloud region (e.g., `us-east-1`) goes completely offline:

1.  **Failover DNS:** Update Anycast DNS/Route53 records to point traffic to the standby region (e.g., `us-west-2`).
2.  **Deploy Infrastructure:** Run the CI/CD pipeline (or manual Helm install / Docker Compose) in the standby region.
    ```bash
    helm install zoop-cloud ./infrastructure/helm/zoop --namespace zoop-prod
    ```
3.  **Restore Database:** In a true multi-region setup, use the cross-region read replica and promote it to the primary writer. If not available, restore from the latest cross-region snapshot.
4.  **Re-establish Relays:** Ensure STUN/TURN relays are provisioned in the new region, as IP changes will require agents to re-discover their relay paths.

## Ephemeral State (Redis)
Redis in the Zoop architecture holds ephemeral signaling state and short-lived caching. In a disaster recovery scenario, **Redis does not need to be restored from a backup**. A fresh, empty Redis instance is sufficient. Agents will automatically re-register their signaling streams upon connecting to the restored API.
