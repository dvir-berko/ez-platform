# ${{ values.name }}

**Team:** ${{ values.team }}
**Tier:** Standard (stateful — DB + secrets)
**Owner:** ${{ values.owner }}

## Overview

${{ values.description }}

## Architecture

EZ Standard service — stateful, with RDS Postgres and secrets from AWS Secrets Manager via External Secrets Operator.

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Service info |
| `/healthz` | GET | Liveness probe |
| `/readyz` | GET | Readiness probe (checks DB) |

## Local Development

```bash
make install
make test
make run
```

## Deployment

- **Dev:** auto-deploys on merge to `main`
- **Prod:** `git tag v1.0.0 && git push origin v1.0.0` → approve in GitHub

## Database

Managed by Terraform (`ez-infra`). Connection string injected via External Secrets Operator from AWS Secrets Manager at runtime.

## Links

- [GitHub Repo](https://github.com/${{ values.githubOrg }}/${{ values.name }})
- [CI/CD](https://github.com/${{ values.githubOrg }}/${{ values.name }}/actions)
