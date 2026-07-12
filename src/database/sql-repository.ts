import postgres from 'postgres';
import type {
  AuditEvent,
  CustomerId,
  Deployment,
  DeploymentId,
  DeploymentStatus,
  DeploymentVersion,
  DeploymentVersionId,
  DesiredStateSnapshot,
  ProvisioningReferences,
  ProvisioningTarget,
  ReconciliationRun,
} from '../shared/index.ts';
import type {DeploymentRepository} from '../core/index.ts';

export interface SqlRepositoryConfig {
  readonly connectionString: string;
}

export class SqlDeploymentRepository implements DeploymentRepository {
  private sql: ReturnType<typeof postgres>;

  constructor(config: SqlRepositoryConfig) {
    this.sql = postgres(config.connectionString);
  }

  async listDeployments(): Promise<readonly Deployment[]> {
    const rows = await this.sql<Deployment[]>`
      SELECT 
        id,
        customer_id as "customerId",
        name,
        target,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM deployments
      ORDER BY created_at DESC
    `;
    return rows;
  }

  async listDeploymentVersions(
    deploymentId: DeploymentId,
  ): Promise<readonly DeploymentVersion[]> {
    const rows = await this.sql<DeploymentVersion[]>`
      SELECT
        id,
        deployment_id as "deploymentId",
        number,
        created_by as "createdBy",
        notes,
        created_at as "createdAt"
      FROM deployment_versions
      WHERE deployment_id = ${deploymentId}
      ORDER BY number DESC
    `;
    return rows;
  }

  async getDeployment(deploymentId: DeploymentId): Promise<Deployment|null> {
    const rows = await this.sql<Deployment[]>`
      SELECT
        id,
        customer_id as "customerId",
        name,
        target,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM deployments
      WHERE id = ${deploymentId}
    `;
    return rows[0] ?? null;
  }

  async getDesiredState(
    versionId: DeploymentVersionId,
  ): Promise<DesiredStateSnapshot|null> {
    const rows = await this.sql<DesiredStateSnapshot[]>`
      SELECT
        id,
        version_id as "versionId",
        keycloak_config as "keycloakConfig",
        auth_providers as "authProviders",
        created_at as "createdAt"
      FROM desired_state_snapshots
      WHERE version_id = ${versionId}
    `;
    return rows[0] ?? null;
  }

  async saveDeployment(deployment: Deployment): Promise<void> {
    await this.sql`
      INSERT INTO deployments
        (id, customer_id, name, target, status, created_at, updated_at)
      VALUES
        (${deployment.id}, ${deployment.customerId}, ${deployment.name}, 
         ${JSON.stringify(deployment.target)}, ${deployment.status},
         ${deployment.createdAt}, ${deployment.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async saveDeploymentVersion(version: DeploymentVersion): Promise<void> {
    await this.sql`
      INSERT INTO deployment_versions
        (id, deployment_id, number, created_by, notes, created_at)
      VALUES
        (${version.id}, ${version.deploymentId}, ${version.number},
         ${version.createdBy}, ${version.notes ?? null}, ${version.createdAt})
      ON CONFLICT (deployment_id, number) DO NOTHING
    `;
  }

  async recordDesiredState(snapshot: DesiredStateSnapshot): Promise<void> {
    await this.sql`
      INSERT INTO desired_state_snapshots
        (id, version_id, keycloak_config, auth_providers, created_at)
      VALUES
        (${snapshot.id}, ${snapshot.versionId},
         ${JSON.stringify(snapshot.keycloakConfig)},
         ${JSON.stringify(snapshot.authProviders)},
         ${snapshot.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  async recordReconciliationRun(run: ReconciliationRun): Promise<void> {
    await this.sql`
      INSERT INTO reconciliation_runs
        (id, deployment_id, started_at, completed_at, status, drift_findings, error)
      VALUES
        (${run.id}, ${run.deploymentId}, ${run.startedAt}, 
         ${run.completedAt ?? null}, ${run.status},
         ${run.driftFindings ? JSON.stringify(run.driftFindings) : null},
         ${run.error ?? null})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  async appendAuditEvent(event: AuditEvent): Promise<void> {
    await this.sql`
      INSERT INTO audit_events
        (id, deployment_id, event_type, data, created_at)
      VALUES
        (${event.id}, ${event.deploymentId}, ${event.eventType},
         ${event.data ? JSON.stringify(event.data) : null}, ${event.createdAt})
    `;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
