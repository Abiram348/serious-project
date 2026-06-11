# SwarmDev Infrastructure

Production-grade, scalable infrastructure for SwarmDev on AWS with Kubernetes (EKS).

---

## 📁 Directory Structure

```
infra/
├── docker-compose.yml              # Local development stack
├── docker-compose.override.yml     # Local dev overrides (hot-reload)
├── docker/                         # Docker helper scripts
│   └── api-migrate.sh              # DB migration entrypoint
├── k8s/                            # Kubernetes manifests (Kustomize)
│   ├── base/                       # Base manifests (deployments, services, ingress)
│   └── overlays/                   # Environment overlays
│       ├── dev/                    # Dev environment
│       ├── staging/                # Staging environment
│       └── production/             # Production environment (+ NetworkPolicies)
└── terraform/                      # Infrastructure as Code
    ├── modules/                    # Reusable Terraform modules
    │   ├── vpc/                    # VPC, subnets, NAT gateways
    │   ├── eks/                    # EKS cluster, node groups, IAM
    │   ├── rds/                    # PostgreSQL RDS
    │   ├── elasticache/            # Redis cluster
    │   ├── ecr/                    # Container registries
    │   ├── s3/                     # Object storage buckets
    │   ├── secrets-manager/        # Secret management
    │   └── cloudwatch/             # Monitoring and alarms
    └── environments/               # Per-environment configs
        ├── dev/
        ├── staging/
        └── production/
```

---

## 🏗️ Architecture

### Local Development (Supabase)
```
Docker Compose / pnpm dev
├── Next.js (web)       → http://localhost:3000
├── Express (api)       → http://localhost:3001
├── FastAI (orchestrator) → http://localhost:8000
├── PostgreSQL          → Supabase (via pooler)
├── Redis               → localhost:6379
└── Qdrant              → localhost:6333
```

### Staging (AWS + EKS)
```
Route 53 → CloudFront → ALB Ingress
                    ├── /     → web (2 replicas, HPA)
                    ├── /api  → api (2 replicas, HPA)
                    └── internal → orchestrator (1 replica)

Managed Services:
├── RDS PostgreSQL (single-AZ, cost-effective)
├── ElastiCache Redis (single node)
└── S3 (file storage)

In-cluster (staging):
├── Redis (optional backup)
└── Qdrant (vector DB)
```

### Production (AWS + EKS)
```
Route 53 → CloudFront → ALB Ingress
                    ├── /     → web (3 replicas, HPA)
                    ├── /api  → api (3 replicas, HPA)
                    └── internal → orchestrator (2 replicas)

Managed Services:
├── RDS PostgreSQL (Multi-AZ)
├── ElastiCache Redis (Multi-AZ, failover)
└── S3 (file storage)
```

---

## 🚀 Quick Start

### Local Development (Uses Supabase — keeps dev free & simple)

Your local dev uses **Supabase** for PostgreSQL (already configured in `apps/api/.env`).

```bash
# One-command setup
./scripts/setup-local.sh

# Or manually:
cd infra
docker compose up -d

# With hot-reload (mounts source code):
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### AWS Infrastructure (First Time) — Staging with RDS

Staging uses **AWS RDS** (managed PostgreSQL) instead of in-cluster Postgres.

```bash
# 1. Bootstrap Terraform backend and apply infrastructure
./scripts/setup-aws.sh staging

# 2. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name swarmdev-staging

# 3. Create K8s secrets from Terraform outputs (critical step!)
./scripts/create-k8s-secrets.sh staging

# 4. Deploy applications
./scripts/deploy-k8s.sh staging $(git rev-parse --short HEAD)
```

---

## 🔧 Environment Configurations

| Env | EKS Nodes | PostgreSQL | Redis | Qdrant | Cost Focus |
|-----|-----------|------------|-------|--------|-----------|
| **Dev** (local) | Docker Compose | **Supabase** (free) | Local container | Local container | **$0** |
| **Dev** (K8s) | 1x t3.medium (spot) | In-cluster | In-cluster | In-cluster | Minimal |
| **Staging** | 2x t3.large | **AWS RDS** | In-cluster | In-cluster | Moderate |
| **Production** | 3x m6i.xlarge | **AWS RDS** (Multi-AZ) | **ElastiCache** (Multi-AZ) | Managed / In-cluster | HA, Performance |

**Database Strategy (Option B):**
- **Local dev** → Supabase (free tier, already working)
- **Staging** → AWS RDS (managed, same VPC as EKS)
- **Production** → AWS RDS Multi-AZ + ElastiCache

---

## 🔐 Security

- **Non-root containers** — All apps run as non-root user
- **Read-only root filesystem** — Where possible
- **Network Policies** — Deny-all by default in production
- **Private subnets** — All workloads in private subnets
- **IRSA** — Fine-grained pod IAM permissions
- **Secrets Manager** — No secrets in Git
- **KMS encryption** — At rest for EBS, RDS, S3
- **TLS 1.3** — For all external traffic

---

## 📊 Monitoring

- **CloudWatch** — Container Insights, RDS Performance Insights, custom dashboards
- **Prometheus + Grafana** — Application metrics, custom dashboards
- **AWS X-Ray** — Distributed tracing (via ADOT)
- **Trivy** — Container vulnerability scanning in CI

---

## 📚 Detailed Guides

- [Kubernetes](./k8s/README.md) — Kustomize overlays, deployments, troubleshooting
- [Terraform](./terraform/README.md) — Module documentation, state management
- [Scripts](../scripts/) — Helper scripts for local dev, deployment, rollback

---

## 🔄 CI/CD

GitHub Actions workflows:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | PR / push to main | Lint, test, build, Trivy scan, push to ECR |
| `deploy.yml` | Push to main | Deploy to staging → manual approval → production |
| `destroy.yml` | Manual | Destroy dev/staging infrastructure |

---

## 💰 Cost Optimization

- **Spot instances** for dev and non-critical workloads
- **Savings Plans** for production baseline capacity
- **Auto-scaling** (HPA) — scale to zero when not needed
- **Lifecycle policies** on ECR and S3
- **Destroy script** for staging when not in use
