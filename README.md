# EZ Platform — Internal Developer Platform

EZ is a **Golden Path Internal Developer Platform (IDP)** built on [Backstage](https://backstage.io). It gives developers a standardized, production-ready path from idea to deployed service — with CI/CD, security scanning, infrastructure, and observability wired in by default.

```
Developer fills "Create Service" form in EZ Portal
    → GitHub repo scaffolded from template
    → CI pipeline attached automatically (build / test / scan / SBOM)
    → Container image published to Amazon ECR (immutable tag)
    → Deployed to Amazon EKS via Helm
    → Security guardrails applied by default
    → Live status surfaced back in EZ Portal
```

---

## Repository Structure

```
ez-platform/
├── ez-platform/        Backstage Developer Portal (app + backend + Helm chart + templates)
├── ez-workflows/       Reusable GitHub Actions CI/CD workflows (the platform engine)
├── ez-infra/           Terraform: ECR, EKS namespaces, IAM OIDC roles, RDS
├── demo/               Fully resolved EZ Lite demo service (FastAPI + Docker)
├── ui-preview/         Static HTML previews of EZ Portal pages
├── docs/               Architecture, Golden Path, Getting Started, CI/CD security gates
├── .github/workflows/  GitHub Actions workflows for the portal itself
└── trivy.yaml          Shared Trivy scanner configuration
```

| Directory | Purpose |
|-----------|---------|
| `ez-platform/` | Backstage app: frontend (`packages/app`), backend (`packages/backend`), `app-config.yaml`, `app-config.production.yaml`, Helm chart (`helm/`), Scaffolder templates (`templates/`) |
| `ez-workflows/` | Centrally-owned reusable workflows (`ci-reusable.yml`, `cd-reusable.yml`, `policy-check-reusable.yml`, `terraform-reusable.yml`) and composite actions (`setup-aws-oidc`, `setup-kubectl`, `helm-deploy`, `publish-summary`) |
| `ez-infra/` | Terraform modules for `ecr/`, `iam-github-oidc/`, `eks-namespace/`, `rds/`; root modules under `envs/dev/`, `envs/staging/`, `envs/prod/` |
| `demo/` | Example EZ Lite service (FastAPI, team: platform, tier: lite) showing exactly what a generated service looks like |
| `ui-preview/` | Static previews of the portal UI (`index.html`, `create-service.html`, `service-detail.html`) |
| `docs/` | Deep-dive documentation for architecture, Golden Path, getting started, and CI/CD security gates |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      EZ Portal (Backstage)                       │
│  Service Catalog  │  "Create Service"  │  TechDocs  │  K8s view  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ scaffolds repo + registers catalog
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  service-my-service (GitHub)                      │
│  src/  │  Dockerfile  │  helm/  │  .github/workflows/ (thin)    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ calls reusable workflows
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ez-workflows (Platform Engine)                   │
│  ci-reusable.yml  │  cd-reusable.yml  │  policy-check-reusable  │
│  terraform-reusable.yml  │  composite actions                    │
└──────┬────────────────────────────────────────┬─────────────────┘
       │ push image (OIDC auth)                 │ helm deploy (OIDC auth)
       ▼                                        ▼
┌─────────────┐                    ┌────────────────────────────────┐
│  Amazon ECR  │                   │  Amazon EKS                     │
│  immutable   │                   │  ┌──────────────────────────┐  │
│  tags, KMS   │                   │  │ Namespace (per team)      │  │
└─────────────┘                    │  │  Deployment + HPA + PDB   │  │
                                   │  │  NetworkPolicy            │  │
┌─────────────┐                    │  │  External Secrets (ESO)   │  │
│  Terraform   │──── namespace ────▶│  └──────────────────────────┘  │
│  (ez-infra)  │──── IAM roles ───▶│  Prometheus / Grafana          │
│              │──── ECR repos ───▶│  Fluent Bit → CloudWatch       │
└─────────────┘                    └────────────────────────────────┘
```

Key architectural principle: **developers consume a stable interface; platform engineers own the implementation.** A single PR to `ez-workflows` updates the delivery logic for every service simultaneously.

See [docs/architecture.md](./docs/architecture.md) for a full component deep-dive.

---

## Service Tiers

| Tier | Use Case | What You Get |
|------|----------|-------------|
| **Lite** | Stateless REST APIs, gRPC services, workers | FastAPI skeleton (Python 3.12), multi-stage Dockerfile, full Helm chart, CI/CD workflows, catalog registration |
| **Standard** | Services that own a database or require AWS secrets | Everything in Lite, plus RDS Postgres/MySQL (Terraform-provisioned), AWS Secrets Manager, External Secrets Operator manifest, IRSA-ready ServiceAccount, DB migration pattern stub |

Standard services require additional IAM roles (`tfDevRoleArn`, `tfProdRoleArn`) to run Terraform as part of provisioning.

---

## Getting Started

### Prerequisites

Before creating a service, the platform team must have provisioned:

- EKS clusters (`ez-dev`, `ez-staging`, `ez-prod`)
- ECR repositories and GitHub OIDC IAM roles (via `ez-infra`)
- EZ Portal running and accessible
- GitHub Environments configured on the service repo (`dev`, `staging`, `prod`)

Contact `#platform-engineering` if anything is missing.

### Create your first service (5 minutes)

1. Open the EZ Portal (AWS ALB hostname) and sign in with GitHub.
2. Click **Create** in the left sidebar.
3. Choose **EZ Lite Service** (stateless) or **EZ Standard Service** (with database).
4. Fill in the form: service name, team, AWS account/region, EKS cluster names, ECR repository, and OIDC IAM role ARNs.
5. Click **Create** — Backstage scaffolds the GitHub repo, registers it in the catalog, and the first CI run triggers automatically.
6. Watch the **Actions** tab in your new repo: build → test → scan → push to ECR → deploy to dev.

See [docs/getting-started.md](./docs/getting-started.md) for the full guide, including prod promotion and day-2 operations.

### Run EZ Portal locally

```bash
cd ez-platform
yarn install --network-timeout 300000
yarn dev
```

The portal frontend starts on `http://localhost:3000` and the backend on `http://localhost:7007`.

Required environment variables for local development:

```bash
export AUTH_GITHUB_CLIENT_ID=<your-github-oauth-app-client-id>
export AUTH_GITHUB_CLIENT_SECRET=<your-github-oauth-app-client-secret>
```

---

## CI/CD Pipeline

Every generated service goes through the same pipeline, owned by `ez-workflows`:

```
PR opened
  ├── policy-check (blocks PR merge)
  │   ├── Gitleaks full-history secret scan
  │   ├── Semgrep SAST scan
  │   ├── Trivy filesystem / secret / misconfiguration scan
  │   ├── Helm lint
  │   ├── OPA/conftest Kubernetes manifest policies
  │   └── Hadolint Dockerfile lint
  │
  └── ci
      ├── unit tests
      ├── docker build
      ├── SBOM generation (Syft, SPDX format)
      ├── container image scan (Grype, blocks on HIGH+)
      ├── AWS OIDC auth (no static keys)
      ├── ECR push (immutable tag = env-shortsha, e.g. dev-abc12345)
      └── publish GitHub Step Summary

Push to dev branch    → auto-deploy to dev    (GitHub Environment: dev)
Push to staging       → auto-deploy to staging (GitHub Environment: staging)
Tag vX.Y.Z            → deploy to prod         (GitHub Environment: prod — REQUIRES APPROVAL)

  deploy (all envs)
  ├── AWS OIDC auth (env-scoped IAM role)
  ├── aws eks update-kubeconfig
  ├── helm upgrade --install --atomic --wait --timeout 10m
  ├── kubectl rollout status (verify)
  └── publish Step Summary with environment / image / URL
```

**Prod promotion** uses a `staging-*` image tag. The promote workflow patches the prod values file in the infra repo, then waits for a required reviewer to approve the GitHub Environment `prod` gate before running `helm upgrade --install --atomic`.

See [docs/ci-cd-security-gates.md](./docs/ci-cd-security-gates.md) for the full gate model and recommended branch protection settings.

---

## Security

| Concern | Control |
|---------|---------|
| AWS authentication | **OIDC only** — no static AWS keys stored in GitHub Secrets |
| Prod deployment | **GitHub Environment `prod` approval gate** — required reviewer must approve before deploy |
| Prod IAM trust | CD prod roles only trust `refs/tags/v*` (version tags, not branches) |
| Dev/staging IAM trust | CD dev/staging roles only trust their respective branch refs |
| Container hardening | Non-root user (UID 1000), `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, all capabilities dropped |
| Image scanning | Trivy v0.68.1 on every build, blocks on HIGH/CRITICAL; SARIF uploaded to GitHub Security |
| Filesystem scanning | Trivy scans vuln + secret + misconfig on every PR and push |
| Nightly scan | Full-severity Trivy scan (UNKNOWN through CRITICAL) on a daily schedule (02:00 UTC) |
| SAST | CodeQL (JavaScript/TypeScript + Python) on every push/PR to main and weekly schedule |
| SBOM | Syft (SPDX format) generated on every build, stored as CI artifact |
| Secret scanning | Gitleaks full-history scan on every PR |
| Kubernetes policies | OPA/conftest on every PR; Kyverno in cluster for runtime enforcement |
| Network isolation | NetworkPolicy (deny-by-default) per namespace via `ez-infra eks-namespace` module |
| Secret management | AWS Secrets Manager → External Secrets Operator → Kubernetes secrets |
| ECR | Immutable image tags, KMS encryption, lifecycle policies |
| Merge protection | Required PR checks (`policy`, `ci`) + branch protection (approvals, up-to-date branch, dismiss stale reviews) |
| Runtime exposure | Scheduled probes for security headers, `/.env`, `/.git/config`, backup artifacts after release |
| PodDisruptionBudget | `minAvailable: 1` configured in all environments |

---

## Infrastructure

Infrastructure is managed by Terraform in `ez-infra/`. State is stored in S3 with DynamoDB locking.

| Component | Details |
|-----------|---------|
| **EKS** | Clusters: `ez-dev`, `ez-staging`, `ez-prod`. Per-team namespaces with ResourceQuota, LimitRange, NetworkPolicy |
| **ECR** | Per-service repositories with immutable tags, KMS encryption, lifecycle policies |
| **IAM (OIDC)** | Separate CI and CD roles per service per environment; no static credentials |
| **RDS** | Postgres/MySQL via `ez-infra rds/` module; deletion protection enabled in prod |
| **External Secrets Operator** | Syncs AWS Secrets Manager secrets into Kubernetes; used by Standard-tier services |
| **ArgoCD** | Multi-source Applications (dev/staging auto-sync; prod manual sync only) defined in `ez-infra/argocd/apps.yaml` |
| **Terraform state** | `ez-tf-state-dev` / `ez-tf-lock-dev` (dev); `ez-tf-state-prod` / `ez-tf-lock-prod` (prod) |

### ArgoCD GitOps

ArgoCD applications are defined in `ez-infra/argocd/apps.yaml`. Each application uses multi-source: the Helm chart comes from the service repo and environment-specific values come from the infra repo.

| Application | Sync | Namespace |
|-------------|------|-----------|
| `ez-platform-dev` | Automated (prune + self-heal) | `ez-dev` |
| `ez-platform-staging` | Automated (prune + self-heal) | `ez-staging` |
| `ez-platform-prod` | **Manual only** (no automated sync) | `ez-prod` |

### Cluster add-ons (platform-provided)

NGINX Ingress Controller, metrics-server, Prometheus + Grafana, Fluent Bit (log shipping to CloudWatch), External Secrets Operator, Kyverno/OPA Gatekeeper, Cluster Autoscaler. Services inherit all of these automatically.

### Adding a new service to infrastructure

Edit `ez-infra/envs/dev/terraform.tfvars` (and the prod equivalent):

```hcl
services = {
  "my-new-service" = {
    team = "my-team"
  }
}
```

Terraform creates: ECR repository, CI IAM role, CD dev/staging/prod IAM roles (each scoped to the correct branch or tag ref).

---

## Environment Configuration

| Environment | Replicas | Autoscaling | Resources (req/limit) | Notes |
|-------------|----------|-------------|----------------------|-------|
| **dev** | 1 | 1–2 pods | 250m CPU / 512Mi RAM — 1000m / 1Gi | Auto-deployed on push to `dev` branch |
| **staging** | 1 | 1–3 pods | 250m CPU / 512Mi RAM — 1000m / 1Gi | Auto-deployed on push to `staging` branch |
| **prod** | 3 | 3–10 pods | 500m CPU / 1Gi RAM — 2000m / 2Gi | Manual approval gate; PostgreSQL backend; SSL required |

**Portal-specific configuration:**

- Local / dev: SQLite (`better-sqlite3`), `http://localhost:3000`
- Production: PostgreSQL with SSL (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from Kubernetes secret `ez-platform-env`), `APP_BASE_URL` and `BACKEND_BASE_URL` from environment variables
- Ingress: AWS ALB (internet-facing), TLS 1.3 (`ELBSecurityPolicy-TLS13-1-2-2021-06`), HTTPS redirect

---

## GitHub Actions Workflows

Workflows for the EZ Portal itself live in `.github/workflows/`.

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ez-platform-deploy.yml` | Push to `main` (paths: `ez-platform/**`), or manual `workflow_dispatch` | Builds the Backstage app, pushes image to ECR with tag `<env>-<sha8>`, runs Trivy image scan, deploys via Helm to the selected environment (`dev` / `staging` / `prod`), waits for ALB hostname, re-runs Helm with correct public URLs, verifies rollout |
| `trivy.yml` | PRs to `main`, pushes to `main`, daily schedule (02:00 UTC) | PR/push: Trivy filesystem scan (vuln + secret + misconfig, HIGH/CRITICAL, blocking) with SARIF upload. Nightly: full-severity scan, SARIF upload |
| `codeql.yml` | Push/PR to `main`, weekly schedule (Mon 04:18 UTC) | CodeQL static analysis for JavaScript/TypeScript and Python, SARIF uploaded to GitHub Security |

**All GitHub Actions are pinned to immutable commit SHAs** (e.g. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`) to prevent supply-chain attacks.

---

## Backstage Plugins

The portal ships with the following Backstage plugins enabled:

| Plugin | Purpose |
|--------|---------|
| Catalog | Service registry with owner, tier, team metadata |
| Scaffolder | Template-based service provisioning |
| TechDocs | Auto-rendered documentation from `docs/` folders |
| Kubernetes | Live pod status, HPA state, events per service |
| GitHub Actions | CI/CD run status per service |
| Org | GitHub team/user directory |
| API Docs | OpenAPI/gRPC spec rendering |
| Catalog Graph | Service dependency visualization |
| Search | Full-text search across catalog + docs |

Authentication uses GitHub OAuth (`plugin-auth-backend-module-github-provider`).

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](./docs/architecture.md) | Component deep-dive: portal, workflows, CI/CD contract, governance model, infrastructure, EKS runtime, provisioning sequence |
| [docs/golden-path.md](./docs/golden-path.md) | What developers get for free, Lite vs Standard tiers, when to deviate from the path |
| [docs/getting-started.md](./docs/getting-started.md) | Step-by-step: create a service, promote to prod, day-2 operations, troubleshooting |
| [docs/ci-cd-security-gates.md](./docs/ci-cd-security-gates.md) | Merge gate model, what each workflow enforces, branch protection recommendations, runtime monitor setup |
| [ez-infra/README.md](./ez-infra/README.md) | Terraform module structure, how to add a service, state backend locations, security model |
| [ez-workflows/README.md](./ez-workflows/README.md) | Reusable workflow contracts (CI/CD/promote-prod), governance model, security, versioning |

---

## Contributing / Platform Team

EZ Platform is owned by the **platform-engineering** team.

- For help creating a service, hit a CI failure, or troubleshooting a deploy: ask in `#platform-engineering`.
- For platform improvements (new features, workflow changes, template updates): open a PR against this repo.
- Required PR checks: `policy` and `ci` must pass; at least one approval required.
- Prod apply (Terraform) requires GitHub Environment `prod` approval.
