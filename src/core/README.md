# core

This package owns the persisted deployment model.

Responsibilities:

- store deployments, versions, desired-state snapshots, and reconciliation history
- expose the API used by the admin UI and sync loop
- coordinate deployment state changes
- record audit events for significant actions
