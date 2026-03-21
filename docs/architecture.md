# EZ Architecture

## Overview

EZ is built from four repositories that compose the complete IDP:

```
ez-platform/   ← Developer UX (Backstage)
ez-workflows/  ← Platform engine (reusable GitHub Actions)
ez-infra/      ← Cloud infrastructure (Terraform)
service-*/     ← Generated services (thin consumers)
```

The key architectural principle: **developers consume a stable interface, platform engineers own the implementation**.

---

## Component Deep Dive

### 1. EZ Portal (Backstage)

The developer front door. Provides:

- **Service Catalog** — every service registered with owner, tier, team, links
- **"Create Service"** — Backstage Scaffolder templates
- **TechDocs** — auto-rendered documentation per service
- **Kubernetes plugin** — live pod status, HPA, events
- **GitHub Actions plugin** — CI/CD run status
- **Scorecard** — service health score (has runbook? has tests? has SLOs?)

**Not** in scope for MVP: Cost attribution UI, incident management, SLO burn-rate dashboards (Phase 2).

### 2. ez-workflows (Platform Engine)

This is the most important component. It's what makes this **platform engineering** and not "random pipelines in every repo".

```
┌─────────────────────────────────────┐
│  service repo (.github/workflows/)  │
│                                     │
│  ci.yml:                            │
│    uses: dvir-berko/ez-workflows/.github/  │
│    workflows/ci-reusable.yml@main   │
│    with:                            │
│      service-name: my-service       │
│      ecr-repository: dvir-berko/my-svc    │
│      ...                            │
└──────────────────┬──────────────────┘
                   │ delegates to
                   ▼
┌─────────────────────────────────────┐
│  ez-workflows (platform repo)       │
│                                     │
│  ci-reusable.yml:                   │
│    - checkout                       │
│    - test                           │
│    - build image                    │
│    - SBOM (Syft)                    │
│    - scan (Grype)                   │
│    - OIDC auth to AWS              │
│    - push to ECR                    │
│    - publish summary                │
└─────────────────────────────────────┘
```

**Why this matters:**
- One PR to `ez-workflows` can update the security scanner for ALL 200 services simultaneously
- Services can't "opt out" of security steps
- Consistent job summaries, consistent failure modes

### 3. CI Contract

Every service gets the same CI:

```
PR opened / push to main
  │
  ├── policy-check (PR only)
  │   ├── helm lint
  │   ├── OPA/conftest (Kubernetes manifests)
  │   ├── Hadolint (Dockerfile)
  │   └── Gitleaks (secret scan)
  │
  └── ci
      ├── unit tests
      ├── docker build
      ├── SBOM (Syft, SPDX format)
      ├── image scan (Grype, blocks on HIGH+)
      ├── AWS OIDC auth
      ├── ECR login
      └── docker push (immutable tag = short SHA)
```

Outputs: `image-repository`, `image-tag`, `image-uri`, `sbom-artifact`

### 4. CD Contract

```
Push to dev      → deploy to dev (auto)
Push to staging  → deploy to staging (auto)
Tag vX.Y.Z       → deploy to prod (GitHub Environment approval)

  deploy
  ├── AWS OIDC auth (env-scoped role)
  ├── get EKS kubeconfig
  ├── kubectl: ensure namespace + labels
  ├── helm upgrade --install
  │   ├── --atomic     (rollback on failure)
  │   ├── --wait       (wait for pods ready)
  │   └── --timeout    (fail fast)
  ├── kubectl rollout status (verify)
  └── publish summary
```

The CD workflow does **not** contain business logic. It's a delivery mechanism.

### 5. Governance (Guardrails not Gates)

| Check | Where | Blocks |
|-------|-------|--------|
| OPA policies | ez-workflows policy-check | PR merge |
| Helm lint | ez-workflows policy-check | PR merge |
| Dockerfile lint | ez-workflows policy-check | PR merge |
| Secret scan | ez-workflows policy-check | PR merge |
| Image scan | ez-workflows CI | CI run |
| Required annotations | Policy check | PR merge |
| Prod approval | GitHub Environments | CD prod job |
| Namespace quotas | Kubernetes ResourceQuota | Runtime |
| Container security | Kyverno/OPA Gatekeeper | Runtime |

### 6. Infrastructure (Terraform)

```
ez-infra/
├── modules/
│   ├── ecr/            # ECR repo + lifecycle + repo policy
│   ├── iam-github-oidc # CI/CD IAM roles (OIDC trust)
│   ├── eks-namespace/  # Namespace + quota + NetworkPolicy
│   └── rds/            # RDS + Secrets Manager
└── envs/
    ├── dev/            # Dev environment (all services)
    └── prod/           # Prod environment (all services)
```

Adding a service = adding a block to `terraform.tfvars`. Terraform apply creates:
- ECR repository (immutable tags, KMS, lifecycle policy)
- CI IAM role (OIDC trust: `refs/heads/dev`, `refs/heads/staging`, `refs/heads/main`)
- CD Dev IAM role (OIDC trust: `refs/heads/dev` only)
- CD Staging IAM role (OIDC trust: `refs/heads/staging` only)
- CD Prod IAM role (OIDC trust: `refs/tags/v*` only)

### 7. EKS Runtime

Platform-provided cluster components (not owned by service teams):

| Component | Purpose |
|-----------|---------|
| NGINX Ingress Controller | Route external traffic |
| metrics-server | HPA CPU metrics |
| Prometheus + Grafana | Metrics + dashboards |
| Fluent Bit | Log shipping to CloudWatch/Loki |
| External Secrets Operator | AWS Secrets Manager → K8s secrets |
| Kyverno / OPA Gatekeeper | Runtime policy enforcement |
| Cluster Autoscaler | Node scaling |

Services inherit all of these automatically.

---

## Sequence: Provisioning a new Lite service

```
Developer                EZ Portal           GitHub              AWS
    │                       │                   │                  │
    │── fill form ──────────▶│                   │                  │
    │                       │─ fetch:template ──▶│                  │
    │                       │── publish:github ──▶│                 │
    │                       │                   │─ CI trigger ─────▶│
    │                       │                   │  test            │
    │                       │                   │  build           │
    │                       │                   │  SBOM            │
    │                       │                   │  scan            │
    │                       │                   │─ OIDC ──────────▶│
    │                       │                   │◀─ token ─────────│
    │                       │                   │─ push ECR ───────▶│
    │                       │                   │                  │
    │                       │                   │─ CD dev ─────────▶│
    │                       │                   │  helm deploy     │
    │                       │                   │  rollout verify  │
    │◀─ portal shows live ──│                   │                  │
```

---

## Phase 2 Roadmap

| Feature | Purpose |
|---------|---------|
| Scheduled drift detection | `helm diff` on cron — catch manual `kubectl` changes |
| Terraform drift checks | `terraform plan` on cron |
| SLO dashboards | Error budget burn-rate in EZ Portal |
| Cost attribution | Per-service AWS cost in EZ Portal |
| Service scorecard | Automated "is this service production-ready?" score |
| ADR tracking | Architecture Decision Records per service |
| Self-service DB provisioning | One-click RDS from EZ Portal (Standard tier) |
