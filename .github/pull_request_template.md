## Summary of Changes
<!-- Provide a clear, concise summary of the changes in this PR -->

## Related Issues
<!-- Link to issue: Closes #123, Fixes #456 -->

## Type of Change
- [ ] :bug: Bug fix (non-breaking change which fixes an issue)
- [ ] :sparkles: New feature (non-breaking change which adds functionality)
- [ ] :boom: Breaking change (fix or feature that alters existing API or protocol contracts)
- [ ] :memo: Documentation update
- [ ] :recycle: Refactor / internal enhancement
- [ ] :wrench: CI/CD, build, or developer tooling

## Affected Component(s)
- [ ] `cmd/zoopd` (Daemon)
- [ ] `cmd/zoop` (CLI)
- [ ] `cloud` / `packages/cloud` (Control Plane & Store)
- [ ] `router` / `packages/router` (OpenWrt Gateway)
- [ ] `packages/agent` (Tunnel, STUN, Roaming, Relay)
- [ ] `mobile` (Flutter UI & Gomobile bindings)
- [ ] `web` (React Dashboard)
- [ ] `infrastructure` / `deployments`

## Verification & Testing
<!-- Describe what tests were run to verify your changes -->
- [ ] Unit tests passed: `make test`
- [ ] Linting passed: `make lint`
- [ ] Code formatted: `make format`
- [ ] (If daemon changed) Diagnostics verified: `zoop doctor`
- [ ] (If web changed) Build verified: `cd web && npm run build`
- [ ] (If mobile changed) Mobile tests passed: `make mobile-test`

## Contributor Checklist
- [ ] My code adheres to the style guidelines of this project.
- [ ] I have performed a self-review of my code.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] I have updated the relevant documentation in `docs/` where appropriate.
- [ ] No plaintext cryptographic keys, credentials, or secrets are committed.
