# CI/CD Security Gates

This repository uses `ez-workflows` as the shared CI/CD base for generated services.

## Merge gate model

PRs are blocked by required CI checks plus GitHub branch protection. CD re-runs critical controls before deploy, and runtime monitoring continues after release.

Recommended required checks for `main` and `master`:

- `policy`
- `ci`

Recommended GitHub branch protection settings:

- Require a pull request before merging
- Require approvals
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Restrict direct pushes
- Dismiss stale approvals when new commits are pushed

## What the base workflows enforce

`policy-check-reusable.yml`:

- Gitleaks full-history secret scan
- Semgrep SAST scan
- Trivy filesystem, secret, and misconfiguration scan
- Helm lint and optional OPA/conftest policy checks
- Blocking checks for tracked `.env*`, backup artifacts, and committed source maps

`ci-reusable.yml`:

- Build, test, SBOM generation, and container image scanning
- Built-image inspection for `.env*`, backup artifacts, open backup directories, and production source maps
- ECR push only on non-PR events
- GitOps patch only on non-PR events

`runtime-security-reusable.yml`:

- Validates required headers on the live app
- Probes `/.env`, `/.git/config`, backup artifacts, and sourcemaps for accidental exposure
- Supports scheduled monitoring and alerting via Slack webhook

## Runtime monitor setup in generated services

Each generated service includes `.github/workflows/runtime-security.yml`.

To activate it:

1. Set repository variable `PROD_BASE_URL` to the production URL.
2. Optionally set secret `SLACK_WEBHOOK_URL` for alerts.
3. Mark the PR checks as required in branch protection.

The runtime monitor runs every 15 minutes and can also be triggered manually.
