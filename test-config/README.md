# Test Configuration Fixtures

The files in this directory (including `identity.key`) are **ephemeral mock cryptographic fixtures** used exclusively for local integration and end-to-end testing of the `zoopd` daemon and client packages.

> [!CAUTION]
> **Do not use keys from this directory in production.**
> These keys are intended solely for automated test verification and sandbox testbeds. Real production node identities must be dynamically generated on the host device via `zoopd` or `packages/agent/identity`.
