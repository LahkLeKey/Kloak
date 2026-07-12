-- Core deployment tables for Kloak

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(customer_id, name)
);

CREATE TABLE IF NOT EXISTS deployment_versions (
  id UUID PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  number INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(deployment_id, number)
);

CREATE TABLE IF NOT EXISTS desired_state_snapshots (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL,
  keycloak_config JSONB NOT NULL,
  auth_providers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id UUID PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  drift_findings JSONB,
  error TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  event_type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_customer ON deployments(customer_id);
CREATE INDEX IF NOT EXISTS idx_versions_deployment ON deployment_versions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_deployment ON reconciliation_runs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_audit_deployment ON audit_events(deployment_id);
