# EZ — Internal Developer Platform

EZ is a **Golden Path** Internal Developer Platform (IDP) that gives developers a standardized, production-ready path from idea to deployed service — without building pipelines or infra patterns themselves.

```
Developer clicks "Create Service" in EZ Portal
    → Repo scaffolded from template
    → CI pipeline automatically attached (build/test/scan/SBOM)
    → Container published to Amazon ECR
    → Deployed to EKS via GitHub Actions + Helm
    → Guardrails applied by default
    → Observability wired
    → Status + links surfaced in EZ Portal
```

## Repositories

| Repo | Purpose |
|------|---------|
| [`ez-platform`](./ez-platform/) | Backstage Developer Portal + Service Templates |
| [`ez-workflows`](./ez-workflows/) | Reusable CI/CD/IaC GitHub Actions (the platform engine) |
| [`ez-infra`](./ez-infra/) | Terraform: ECR, EKS namespaces, IAM OIDC roles |
| `service-*` | Generated service repos (from templates) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         EZ Portal (Backstage)                    │
│  Service Catalog  │  "Create Service"  │  Scorecard  │  Docs    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ scaffolds repo
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    service-my-service (GitHub)                   │
│  app/  │  Dockerfile  │  helm/  │  .github/workflows/ (thin)   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ calls reusable workflows
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ez-workflows (Platform Engine)                   │
│  ci-reusable.yml  │  cd-reusable.yml  │  terraform-reusable.yml │
│  policy-check.yml │  composite actions                           │
└──────┬────────────────────────────────────────┬─────────────────┘
       │ push image                             │ helm deploy
       ▼                                        ▼
┌─────────────┐                    ┌────────────────────────────┐
│  Amazon ECR  │                   │  Amazon EKS                 │
│  (immutable  │                   │  ┌──────────────────────┐  │
│   tags, KMS) │                   │  │ Namespace (per team)  │  │
└─────────────┘                    │  │  Deployment           │  │
                                   │  │  HPA + PDB            │  │
┌─────────────┐                    │  │  NetworkPolicy        │  │
│  Terraform   │──── namespace ────▶│  └──────────────────────┘  │
│  (ez-infra)  │──── IAM roles ───▶│  Prometheus/Grafana        │
│              │──── ECR repos ───▶│  External Secrets Operator  │
└─────────────┘                    └────────────────────────────┘
```

## Service Tiers

| Tier | Use Case | Includes |
|------|----------|---------|
| **Lite** | Stateless APIs, workers | App + Dockerfile + Helm + CI/CD |
| **Standard** | Services with DB/state | Lite + RDS + Secrets Manager + ESO |

## Golden Path Flow

### Flow 1: Create a new service (5 min)

1. Open EZ Portal → "Create Service (Lite)"
2. Fill form: name, team, AWS config, IAM roles
3. Backstage creates the repo and registers it in the catalog
4. CI runs automatically → image pushed to ECR
5. Service auto-deploys to dev via Helm
6. Developer sees live status in EZ Portal

### Flow 2: Deploy to production

1. Create release tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Environment "prod" blocks until an approver clicks Approve
3. After approval: `helm upgrade --install --atomic` runs
4. Rollout verified (`kubectl rollout status`)
5. Service is live in prod

## Security Model

| Concern | Solution |
|---------|---------|
| AWS auth | **OIDC only** — no static keys in GitHub Secrets |
| Prod deploy | **GitHub Environment approval** required |
| Prod OIDC trust | Only trusts `refs/tags/v*` (tags, not branches) |
| Container security | Non-root user, `readOnlyRootFilesystem`, dropped capabilities |
| Image scanning | Grype on every build, SARIF uploaded to GitHub Security |
| SBOM | Syft (SPDX) on every build, stored as artifact |
| Secret management | AWS Secrets Manager → External Secrets Operator |
| K8s policies | OPA/conftest on every PR, Kyverno in cluster |
| Drift detection | Scheduled `helm diff` (Phase 2) |
| Merge protection | Required PR checks + branch protection rules |
| Runtime exposure checks | Scheduled header and exposed-file probes after release |

## Getting Started

- [Setting up your first service](./docs/getting-started.md)
- [Golden Path guide](./docs/golden-path.md)
- [Architecture deep dive](./docs/architecture.md)
- [CI/CD security gates](./docs/ci-cd-security-gates.md)
- [Running EZ locally](./ez-platform/README.md)

## Design Decisions

**GitHub Actions as CD (not ArgoCD)**
Everything stays in one control plane. GitHub Environments provide native approval gates. Low operational overhead for MVP.

**Helm over raw manifests**
Standard Kubernetes packaging. Atomic deploys with automatic rollback on failure. Simple, well-understood contract for templates.

**OIDC instead of static AWS keys**
Repo-scoped trust policies. No secret rotation. Works per environment. Industry standard.

**Reusable workflows over per-repo pipelines**
Platform engineers own delivery logic. Services consume a stable interface. Prevents pipeline snowflakes. Central security updates.
