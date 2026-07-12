# aws

Real AWS provisioner for creating cloud infrastructure resources.

## Supported Resources

- **RDS** — PostgreSQL database instances
- **Route53** — DNS record management
- **Secrets Manager** — Secure credential storage
- **ALB** — Application Load Balancer (ingress)

## Installation

```bash
npm install @aws-sdk/client-rds @aws-sdk/client-elastic-load-balancing-v2 @aws-sdk/client-route-53 @aws-sdk/client-secrets-manager
```

## Configuration

```typescript
import {AwsProvisioner} from './src/aws/index.ts';

const provisioner = new AwsProvisioner({
  region: 'us-east-1',
  accountId: process.env.AWS_ACCOUNT_ID,
  hostedZoneId: process.env.AWS_HOSTED_ZONE_ID, // optional
});
```

## Usage

```typescript
const plan = {
  deploymentId: 'customer-acme',
  target: {
    region: 'us-east-1',
    createDatabase: true,
    createIngress: true,
    createDns: true,
    createSecrets: true,
  },
};

const result = await provisioner.provision(plan);
console.log(result.externalReferences);
// {
//   database: 'kloak-db-xxx.rds.amazonaws.com',
//   database_port: '5432',
//   database_password: '...',
//   secrets_arn: 'arn:aws:secretsmanager:...',
//   dns_record: 'customer-acme.example.com',
//   ingress_type: 'ALB',
//   ...
// }
```

## AWS Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:DescribeDBInstances"
      ],
      "Resource": "arn:aws:rds:*:*:db/kloak-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:kloak/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:DescribeLoadBalancers"
      ],
      "Resource": "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/kloak-*"
    }
  ]
}
```

## Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_ACCOUNT_ID=123456789012
export AWS_HOSTED_ZONE_ID=Z1234567890ABC
```

## Features

- **Automatic tagging** — All resources tagged with DeploymentId and ManagedBy=kloak
- **Password generation** — Secure random passwords for databases
- **Error handling** — Graceful failure and error reporting
- **Resource cleanup** — `teardown()` method to delete provisioned resources
- **Modular** — Import only needed AWS SDK clients

## Provisioning Plan

```typescript
interface ProvisioningPlan {
  deploymentId: DeploymentId;
  target: {
    region: string;
    createDatabase: boolean;
    createIngress: boolean;
    createDns: boolean;
    createSecrets: boolean;
    securityGroupId?: string;
    dnsDomain?: string;
  };
}
```

## External References

The provisioner returns external references for each resource:

```typescript
{
  database: 'endpoint.rds.amazonaws.com',
  database_port: '5432',
  database_password: '...',
  secrets_arn: 'arn:aws:secretsmanager:...',
  dns_record: 'deployment.example.com',
  dns_zone_id: 'Z123...',
  ingress_type: 'ALB',
  ingress_scheme: 'internet-facing',
}
```

These are persisted in the core deployment model via `recordProvisioningReferences()`.
