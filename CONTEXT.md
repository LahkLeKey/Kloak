# Kloak

Kloak manages Keycloak deployments across cloud and on-prem environments. It packages Keycloak and the surrounding resources into one deployment.

## Language

**Kloak**:
The product for provisioning, upgrading, reconciling, and repairing customer deployments.
_Avoid_: platform, app, dashboard

**Customer deployment**:
An isolated instance of the Kloak-managed auth stack for one customer.
_Avoid_: tenant, shared environment, workspace

**Auth stack**:
Keycloak plus the supporting resources around it.
_Avoid_: backend, auth backend, auth system

**Keycloak**:
The identity authority that stores and enforces users, roles, clients, groups, sessions, and related auth state.
_Avoid_: auth database, custom identity store, source of truth

**Core data**:
Kloak's Postgres-backed model of desired state, deployment metadata, and workflow.
_Avoid_: primary database, operational cache, control plane, core store

**Desired state**:
The versioned auth configuration Kloak intends Keycloak and the surrounding infrastructure to match.
_Avoid_: live state, current config

**Reconciliation**:
The automatic process that detects drift between desired state and live state and repairs it.
_Avoid_: sync job, refresh, copy

**Version**:
A named, roll-forwardable release of a customer deployment and its auth stack.
_Avoid_: patch, hotfix, mutable config

**Isolation**:
The default model where each customer deployment runs in its own cloud account or project.
_Avoid_: shared tenancy, pooled deployment

**Operator**:
The person who provisions, manages, and repairs Kloak deployments.
_Avoid_: admin, user, tenant owner
