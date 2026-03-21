# ez-workflows

The EZ Platform reusable workflow library — the **engine of the Golden Path**.

All EZ services call these centrally-owned workflows. Platform engineers update delivery logic here; services get improvements automatically.

## Structure

```
ez-workflows/
├── .github/workflows/
│   ├── ci-reusable.yml          # Build → Test → SBOM → Scan → Push to ECR
│   ├── cd-reusable.yml          # Helm deploy to EKS (dev auto / prod gated)
│   ├── terraform-reusable.yml   # Terraform plan + apply
│   └── policy-check-reusable.yml# Helm lint, OPA/conftest, Hadolint, Gitleaks
└── actions/
    ├── setup-aws-oidc/          # Composite: OIDC auth to AWS
    ├── setup-kubectl/           # Composite: EKS kubeconfig
    ├── helm-deploy/             # Composite: helm upgrade --install
    └── publish-summary/         # Composite: GitHub Step Summary writer
```

## CI Workflow Contract

Services call the CI workflow from their own `.github/workflows/ci.yml`:

```yaml
jobs:
  ci:
    uses: your-org/ez-workflows/.github/workflows/ci-reusable.yml@main
    with:
      service-name:    my-service
      ecr-repository:  my-org/my-service
      aws-account-id:  "123456789012"
      aws-region:      us-east-1
      iam-role-arn:    arn:aws:iam::123456789012:role/ez-ci-my-service
    secrets: inherit
```

### CI Outputs

| Output | Description |
|--------|-------------|
| `image-repository` | Full ECR repository URI |
| `image-tag` | Tag pushed (short SHA by default) |
| `image-uri` | `repository:tag` — use this in CD |
| `sbom-artifact` | Name of uploaded SBOM artifact |

## CD Workflow Contract

```yaml
jobs:
  deploy-dev:
    needs: ci
    uses: your-org/ez-workflows/.github/workflows/cd-reusable.yml@main
    with:
      service-name:      my-service
      image-repository:  ${{ needs.ci.outputs.image-repository }}
      image-tag:         ${{ needs.ci.outputs.image-tag }}
      eks-cluster-name:  ez-dev
      namespace:         my-team
      environment:       dev
      iam-role-arn:      arn:aws:iam::123456789012:role/ez-cd-dev
    secrets: inherit

  deploy-prod:
    needs: [ci, deploy-dev]
    uses: your-org/ez-workflows/.github/workflows/cd-reusable.yml@main
    with:
      environment: prod          # <-- GitHub Environment approval gate
      ...
```

## Prod Promotion Contract

Use the promotion workflow to move an already-built `staging-*` image tag into the prod values file in your infra repo. The workflow requires an explicit `values-file` path so it does not assume a shared global file.

```yaml
jobs:
  promote-prod:
    uses: your-org/ez-workflows/.github/workflows/promote-prod-reusable.yml@main
    with:
      service-name:      my-service
      image-tag:         staging-abc12345
      reason:            release approved by platform
      infra-repo:        your-org/ez-infra
      values-file:       envs/prod/services/my-service.yaml
      image-tag-path:    .image.tag
    secrets: inherit
```

## Governance Model

| Environment | Gate | Trigger |
|-------------|------|---------|
| `dev` | Auto-deploy | Push to `dev` |
| `staging` | Auto-deploy | Push to `staging` |
| `prod` | **Required reviewer approval** | Promote a `staging-*` image tag |

Approval gates are configured as **GitHub Environments** on the caller's repository. No additional tooling required.

## Security

- **OIDC auth only** — no static AWS keys stored in GitHub Secrets
- Each environment has a **separate IAM role** scoped to its EKS namespace
- Image scanning (Trivy) blocks on `HIGH` severity by default
- SBOM generated for every build (Syft, SPDX format)
- Gitleaks runs on every PR

## Versioning

Pin to a specific tag for stability:

```yaml
uses: your-org/ez-workflows/.github/workflows/ci-reusable.yml@v1.2.0
```

Or use `@main` to always get the latest platform improvements (recommended for internal use).
