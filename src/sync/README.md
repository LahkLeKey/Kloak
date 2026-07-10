# sync

This package handles drift detection and repair.

Responsibilities:

- fetch desired state from core
- read live Keycloak and infrastructure state
- compare desired vs live state
- apply repairs end to end
- verify the final state and write reconciliation results back to the core store
