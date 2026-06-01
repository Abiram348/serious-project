# SwarmDev Terraform Infrastructure

This directory contains Terraform configurations for deploying SwarmDev to AWS EKS.

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured with appropriate credentials
- kubectl installed

## Quick Start

### 1. Initialize Terraform

```bash
cd infra/terraform
terraform init
```

### 2. Create S3 bucket for state (if not exists)

```bash
aws s3 mb s3://swarmdev-terraform-state --region us-west-2
aws s3api put-bucket-versioning --bucket swarmdev-terraform-state --versioning-configuration Status=Enabled
```

### 3. Review and Apply

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### 4. Configure kubectl

```bash
aws eks update-kubeconfig --region us-west-2 --name swarmdev-<suffix>
```

### 5. Deploy Kubernetes Resources

```bash
kubectl apply -k ../k8s/
```

## Configuration Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-west-2` | AWS region |
| `environment` | `dev` | Environment name |
| `min_nodes` | `1` | Minimum node count |
| `max_nodes` | `5` | Maximum node count |
| `desired_nodes` | `2` | Desired node count |

## Outputs

After apply, you'll get:
- `cluster_name` - EKS cluster name
- `cluster_endpoint` - API endpoint
- `configure_kubectl` - kubectl config command
- `vpc_id` - VPC ID
- Subnet IDs

## Managed Services (Optional)

To use RDS instead of in-cluster PostgreSQL:
1. Uncomment `rds.tf` resources
2. Update `infra/k8s/secrets.yaml` with RDS endpoint
3. Run `terraform apply`

## Cost Optimization

- Uses SPOT instances for node groups
- Single NAT gateway for dev environment
- Auto-scaling enabled (1-5 nodes)

## Cleanup

```bash
terraform destroy
```

**Warning**: This deletes all resources including persistent data!
