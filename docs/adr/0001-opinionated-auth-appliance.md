# Auth product

Kloak is an auth product, not a general-purpose deployment platform. Keycloak is the authority for live auth state. Kloak keeps the desired state and workflow in Postgres, reconciles drift automatically, and provisions the supporting resources as deployments. Deployments are isolated by default.

## Consequences

- Deployments roll forward instead of mutating in place.
- The UI and core store may lag behind live Keycloak state briefly, but reconciliation closes that gap.
- Isolation is the default operating model.
- Advanced installs can still target an existing cloud account or project.
