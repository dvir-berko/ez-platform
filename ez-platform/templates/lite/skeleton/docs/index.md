# ${{ values.name }}

**Team:** ${{ values.team }}
**Tier:** Lite (stateless)
**Owner:** ${{ values.owner }}

## Overview

${{ values.description }}

## Architecture

This service is an EZ Lite service — stateless, containerized, deployed to EKS via Helm.

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Service info |
| `/healthz` | GET | Liveness probe |
| `/readyz` | GET | Readiness probe |

## Local Development

```bash
# Install dependencies
make install

# Run tests
make test

# Run locally
make run
# → http://localhost:8080
```

## Deployment

- **Dev:** auto-deploys on merge to `main`
- **Prod:** deploy by pushing a `vX.Y.Z` tag, then approve in GitHub

See [EZ Golden Path](https://ez.internal/docs/golden-path) for full details.

## Links

- [GitHub Repo](https://github.com/${{ values.githubOrg }}/${{ values.name }})
- [CI/CD](https://github.com/${{ values.githubOrg }}/${{ values.name }}/actions)
- [EZ Portal](https://portal.ez.internal/catalog/${{ values.name }})
