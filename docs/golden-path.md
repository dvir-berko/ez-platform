# The EZ Golden Path

The Golden Path is the **one right way** to build and ship a service at this organization. It's not the only way — but it's the path with:

- Zero pipeline setup time
- Security baked in
- Observability wired
- Compliance covered
- Support from the platform team

## What you get for free

When you create a service on the Golden Path, you get all of this without writing a single line of pipeline or infrastructure code:

### Delivery
- Build pipeline (GitHub Actions)
- Docker image built and pushed to ECR (immutable tags)
- Helm chart pre-configured for EKS
- Auto-deploy to dev on every merge to main
- Gated prod deploy (requires approval)
- Automatic rollback on failed deploy (Helm atomic)

### Security
- OIDC auth to AWS (no static secrets)
- Container image vulnerability scan (Grype)
- SBOM generated on every build (Syft, SPDX)
- Dockerfile lint (Hadolint)
- Secret scan (Gitleaks)
- Non-root container, read-only filesystem
- OPA policies enforced on every PR

### Kubernetes
- Deployment with rolling updates
- HPA (autoscaling)
- PodDisruptionBudget (zero-downtime deploys)
- Liveness + readiness probes
- ResourceQuota (namespace-level)
- LimitRange (per-container defaults)
- NetworkPolicy (deny-by-default)
- TopologySpreadConstraints (multi-AZ)

### Observability
- Prometheus metrics endpoint (add your own metrics)
- Grafana dashboard template
- Log shipping to CloudWatch via Fluent Bit
- Healthz / readyz endpoints

### Developer Experience
- TechDocs auto-rendered from your `docs/` folder
- Service catalog entry in EZ Portal
- Links to CI, CD, Grafana dashboard
- Runbook stub to fill in

## When to go off-path

The Golden Path covers 80% of services. You may legitimately need to deviate for:

| Scenario | Recommendation |
|----------|----------------|
| Lambda functions | Use the EZ Lambda template (Phase 2) |
| Static sites | Use S3 + CloudFront module directly |
| Batch jobs / CronJobs | Standard Helm chart with `kind: CronJob` |
| Very unusual runtime (e.g. Rust, JVM) | Use a custom Dockerfile; rest of Golden Path still applies |
| External SaaS (not deployed by us) | Register in catalog as `type: external-service` |

If you're deviating significantly, talk to `#platform-engineering` first. They may extend the Golden Path to cover your case.

## Service tiers

### Lite (stateless)

For: REST APIs, gRPC services, consumers, workers with no persistent state.

Includes:
- FastAPI skeleton (Python 3.12)
- Multi-stage Dockerfile
- Full Helm chart
- CI/CD workflows
- Catalog registration

### Standard (stateful)

For: Services that own a database or need secrets from AWS Secrets Manager.

Includes everything in Lite, plus:
- RDS Postgres/MySQL provisioned by Terraform
- AWS Secrets Manager secret with connection string
- External Secrets Operator manifest (pulls secret into K8s)
- IRSA-ready ServiceAccount (for AWS SDK access from pods)
- DB migration pattern stub

## The workflow contract

Services interact with the platform through a **stable contract** — the workflow inputs/outputs. This contract is versioned. When the platform team improves the CI/CD engine, services automatically get the improvements.

```
Service repo                    ez-workflows (platform)

ci.yml                          ci-reusable.yml
  with:                           jobs:
    service-name: foo      ──▶     ci:
    ecr-repository: o/foo            - test
    aws-account-id: 123              - build
    iam-role-arn: arn:…              - SBOM
  outputs:                          - scan
    image-tag: abc1234   ◀──         - push ECR
    image-uri: …                     - summary
```

The service team controls: the `with:` inputs.
The platform team controls: every step inside `ci-reusable.yml`.
