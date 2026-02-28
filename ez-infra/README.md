# ez-infra

Terraform infrastructure for the EZ Platform.

## Structure

```
ez-infra/
├── modules/
│   ├── ecr/              # ECR repository + lifecycle + repo policy
│   ├── iam-github-oidc/  # CI/CD IAM roles via GitHub OIDC
│   ├── eks-namespace/    # Namespace + quota + LimitRange + NetworkPolicy
│   └── rds/              # RDS Postgres/MySQL + Secrets Manager
└── envs/
    ├── dev/              # Dev environment root module
    └── prod/             # Prod environment root module
```

## How it works

- **PRs** trigger `terraform plan` (posted as PR comment)
- **Merges to main** trigger `terraform apply` for dev (auto)
- **Prod apply** requires GitHub Environment `prod` approval

## Adding a new service

Edit `envs/dev/terraform.tfvars` (and prod):

```hcl
services = {
  "my-new-service" = {
    team = "my-team"
  }
}
```

This creates:
- An ECR repository
- CI IAM role (ECR push via OIDC)
- CD Dev IAM role (EKS access via OIDC, main branch only)
- CD Prod IAM role (EKS access via OIDC, tags only)

## State backend

| Environment | S3 Bucket | DynamoDB Table |
|-------------|-----------|----------------|
| dev | `ez-tf-state-dev` | `ez-tf-lock-dev` |
| prod | `ez-tf-state-prod` | `ez-tf-lock-prod` |

State buckets must be created manually before first `terraform init`.

## Security

- All IAM roles use **OIDC trust** (no static keys)
- Prod CD roles only trust tag refs (`refs/tags/v*`)
- Dev CD roles only trust `refs/heads/main`
- ECR repos have **immutable tags**
- RDS instances have **deletion protection** in prod
