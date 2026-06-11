# SwarmDev Terraform Infrastructure

Modular Terraform configuration for AWS infrastructure.

## Modules

| Module | Purpose |
|--------|---------|
| `vpc` | VPC, public/private subnets, NAT gateways, route tables |
| `eks` | EKS cluster, managed node groups, IAM roles, OIDC provider |
| `rds` | PostgreSQL RDS with Multi-AZ, backups, encryption |
| `elasticache` | Redis cluster with failover |
| `ecr` | Container registries with lifecycle policies |
| `s3` | Encrypted buckets with versioning |
| `secrets-manager` | Centralized secret storage |
| `cloudwatch` | Log groups, alarms, dashboards |

## Usage

### First-time setup (bootstrap backend)

```bash
# Create S3 bucket and DynamoDB table for Terraform state
aws s3api create-bucket --bucket swarmdev-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket swarmdev-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name swarmdev-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Deploy an environment

```bash
# Staging
cd infra/terraform/environments/staging
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Destroy an environment

```bash
cd infra/terraform/environments/staging
terraform destroy
```

Or use the script:
```bash
./scripts/setup-aws.sh staging
# Select "destroy" when prompted
```

## State Management

- **Backend**: S3 with DynamoDB locking
- **Encryption**: Enabled (AES-256)
- **Versioning**: Enabled on S3 bucket
- **Never** commit `terraform.tfvars` with real secrets

## Required AWS Permissions

The IAM role/user running Terraform needs:

- `AmazonEC2FullAccess`
- `AmazonEKSClusterPolicy`
- `AmazonEKSWorkerNodePolicy`
- `AmazonRDSFullAccess`
- `AmazonElastiCacheFullAccess`
- `AmazonS3FullAccess`
- `SecretsManagerReadWrite`
- `CloudWatchFullAccess`
- `IAMFullAccess` (for creating roles)

For production, use a dedicated CI/CD role with the minimum required permissions.
