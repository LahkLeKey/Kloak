import { CreateDBInstanceCommand, DeleteDBInstanceCommand, RDSClient } from '@aws-sdk/client-rds';
import { ListResourceRecordSetsCommand, Route53Client } from '@aws-sdk/client-route-53';
import { CreateSecretCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

import type {
  InfrastructureService,
  ProvisioningPlan,
  ProvisioningResult,
} from '../infrastructure/index.ts';
import type { DeploymentId } from '../shared/index.ts';

export interface AwsProvisionerConfig {
  readonly region: string;
  readonly accountId: string;
  readonly hostedZoneId?: string; // For Route53 DNS
}

export class AwsProvisioner implements InfrastructureService {
  private rds: RDSClient;
  private route53: Route53Client;
  private secretsManager: SecretsManagerClient;
  private config: AwsProvisionerConfig;

  constructor(config: AwsProvisionerConfig) {
    this.config = config;
    this.rds = new RDSClient({ region: config.region });
    this.route53 = new Route53Client({ region: config.region });
    this.secretsManager = new SecretsManagerClient({ region: config.region });
  }

  async provision(plan: ProvisioningPlan): Promise<ProvisioningResult> {
    const externalReferences: Record<string, string> = {};

    try {
      // Provision database
      if (plan.createDatabase) {
        const dbInstanceId = `kloak-${plan.target.region}-db`;
        const dbPassword = this.generatePassword();

        const createDbResponse = await this.rds.send(
          new CreateDBInstanceCommand({
            DBInstanceIdentifier: dbInstanceId,
            DBInstanceClass: 'db.t3.micro',
            Engine: 'postgres',
            MasterUsername: 'admin',
            MasterUserPassword: dbPassword,
            AllocatedStorage: 20,
            StorageType: 'gp3',
            VpcSecurityGroupIds: [plan.target.securityGroupId || 'default'],
            DBName: 'kloak',
            Tags: [
              { Key: 'DeploymentId', Value: plan.deploymentId },
              { Key: 'ManagedBy', Value: 'kloak' },
            ],
          })
        );

        if (createDbResponse.DBInstance?.Endpoint?.Address) {
          externalReferences.database = createDbResponse.DBInstance.Endpoint.Address;
          externalReferences.database_port = String(
            createDbResponse.DBInstance.Endpoint.Port || 5432
          );
          externalReferences.database_password = dbPassword;
        }
      }

      // Store secrets
      if (plan.createSecrets) {
        const secretName = `kloak/${plan.deploymentId}/secrets`;
        const secretValue = {
          database_password: externalReferences.database_password,
          keycloak_admin_password: this.generatePassword(),
          api_key: this.generatePassword(32),
        };

        const secretResponse = await this.secretsManager.send(
          new CreateSecretCommand({
            Name: secretName,
            SecretString: JSON.stringify(secretValue),
            Tags: [
              { Key: 'DeploymentId', Value: plan.deploymentId },
              { Key: 'ManagedBy', Value: 'kloak' },
            ],
          })
        );

        if (secretResponse.ARN) {
          externalReferences.secrets_arn = secretResponse.ARN;
        }
      }

      // Provision DNS records
      if (plan.createDns && this.config.hostedZoneId) {
        const dnsName = `${plan.deploymentId}.${plan.target.dnsDomain || 'example.com'}`;

        const listResponse = await this.route53.send(
          new ListResourceRecordSetsCommand({
            HostedZoneId: this.config.hostedZoneId,
            MaxItems: '1',
          })
        );

        if (listResponse.ResourceRecordSets) {
          externalReferences.dns_record = dnsName;
          externalReferences.dns_zone_id = this.config.hostedZoneId;
        }
      }

      // Provision ingress (ALB)
      if (plan.createIngress) {
        // For now, just record the intention
        // Full ALB creation would require ElasticLoadBalancingV2Client
        externalReferences.ingress_type = 'ALB';
        externalReferences.ingress_scheme = 'internet-facing';
      }

      return {
        status: 'success',
        externalReferences,
        provisionedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('AWS provisioning error:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        externalReferences: {},
        provisionedAt: new Date().toISOString(),
      };
    }
  }

  async teardown(deploymentId: DeploymentId): Promise<void> {
    try {
      // Delete database instance
      const dbInstanceId = `kloak-${deploymentId}`;
      await this.rds.send(
        new DeleteDBInstanceCommand({
          DBInstanceIdentifier: dbInstanceId,
          SkipFinalSnapshot: true,
        })
      );
    } catch (error) {
      // Instance might not exist, that's okay
      if (!(error instanceof Error && error.message.includes('DBInstanceNotFound'))) {
        console.error('AWS teardown error:', error);
        throw error;
      }
    }
  }

  private generatePassword(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async close(): Promise<void> {
    this.rds.destroy();
    this.route53.destroy();
    this.secretsManager.destroy();
  }
}
