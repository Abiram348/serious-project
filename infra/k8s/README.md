# SwarmDev Kubernetes manifests

Kustomize-based Kubernetes manifests for deploying SwarmDev to EKS.

## Structure

```
k8s/
├── base/                 # Base manifests (environment-agnostic)
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── serviceaccount.yaml
│   ├── web/
│   ├── api/
│   ├── orchestrator/
│   ├── postgres/         # Dev/staging only
│   ├── redis/            # Dev/staging only
│   ├── qdrant/           # Dev/staging only
│   └── ingress/
└── overlays/
    ├── dev/              # Single replicas, in-cluster DB/cache
    ├── staging/          # Small scale, in-cluster DB/cache
    └── production/       # Multi-AZ, AWS managed services, NetworkPolicies
```

## Usage

### Apply an overlay

```bash
# Dev
kubectl apply -k infra/k8s/overlays/dev

# Staging
kubectl apply -k infra/k8s/overlays/staging

# Production
kubectl apply -k infra/k8s/overlays/production
```

### Update image tags

```bash
cd infra/k8s/overlays/staging
kustomize edit set image swarmdev-web=your-ecr/web:v1.2.3
kustomize edit set image swarmdev-api=your-ecr/api:v1.2.3
kustomize edit set image swarmdev-orchestrator=your-ecr/orchestrator:v1.2.3
kubectl apply -k .
```

### Preview changes

```bash
kustomize build infra/k8s/overlays/staging | kubectl diff -f -
```

## Production-specific features

- **NetworkPolicies** — Zero-trust networking, deny-all by default
- **PodDisruptionBudgets** — Minimum 1 pod available during disruptions
- **HPA** — Auto-scaling based on CPU (70%) and memory (80%)
- **IRSA** — Fine-grained AWS IAM permissions via service accounts
- **No in-cluster DB/cache** — Uses RDS and ElastiCache

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n swarmdev-staging

# View logs
kubectl logs -n swarmdev-staging -l app.kubernetes.io/name=api --tail=100 -f

# Describe a pod
kubectl describe pod -n swarmdev-staging staging-web-xxxx

# Rollback a deployment
kubectl rollout undo deployment/staging-web -n swarmdev-staging

# Port-forward for local debugging
kubectl port-forward -n swarmdev-staging svc/staging-api 3001:3001
```
