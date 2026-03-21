# Getting Started with EZ

## Prerequisites

Before you can use EZ, your platform team must have provisioned:

- [ ] EKS clusters (dev + prod)
- [ ] ECR repositories (via `ez-infra`)
- [ ] GitHub OIDC IAM roles (via `ez-infra`)
- [ ] EZ Portal running (Backstage)
- [ ] GitHub Environments configured on your repo (`dev`, `prod`)

If anything is missing, contact `#platform-engineering`.

## Create your first service (5 minutes)

### Step 1: Open EZ Portal

Navigate to `https://portal.ez.internal` and sign in with GitHub.

### Step 2: Click "Create"

In the left sidebar, click **Create** → choose **EZ Lite Service** (stateless) or **EZ Standard Service** (with database).

### Step 3: Fill in the form

| Field | Description |
|-------|-------------|
| Service Name | Lowercase, hyphens only. e.g. `payment-processor` |
| Team | Your team identifier (for labels + on-call) |
| AWS Account ID | 12-digit AWS account |
| EKS Cluster (Dev) | Usually `ez-dev` |
| Namespace | Your team's namespace |
| ECR Repository | `your-org/your-service-name` |
| CI Role ARN | Provided by platform team for your service |
| CD Dev Role ARN | Provided by platform team |
| CD Prod Role ARN | Provided by platform team |

### Step 4: Click "Create"

Backstage will:
1. Create a GitHub repository from the template
2. Register it in the catalog
3. Trigger the first CI run automatically

### Step 5: Watch it deploy

- Check the **Actions** tab in your new GitHub repo
- CI runs: build → test → scan → push to ECR
- CD runs automatically to **dev** on merge to main
- Visit **EZ Portal** → your service to see live status

## Promote to prod

Prod promotions use the `staging-*` image tag produced by the staging branch:

```bash
staging-abc12345
```

This triggers the `Promote → prod` workflow, which:
1. Waits for approval in the GitHub Environment `prod`
2. Patches the configured prod values file in your infra repo with that exact tag
3. After approval → `helm upgrade --install --atomic`
4. If deploy fails → Helm automatically rolls back

### Who can approve?

Anyone in the **required reviewers** list for the `prod` GitHub Environment.
Configure this in: **Repo Settings → Environments → prod → Required reviewers**.

## Day 2 operations

### Check service status

```bash
kubectl get pods -n <your-namespace>
kubectl get hpa  -n <your-namespace>
```

### View logs

```bash
kubectl logs -l app.kubernetes.io/name=<service-name> -n <namespace> --follow
```

### Manual rollback

```bash
# List Helm releases
helm history <service-name> -n <namespace>

# Rollback to previous revision
helm rollback <service-name> -n <namespace>
```

### Scale manually

```bash
kubectl scale deployment/<service-name> --replicas=5 -n <namespace>
```

## Troubleshooting

**CI fails on image scan**
- Check the Security tab in GitHub for vulnerability details
- Fix the vulnerability or override if it's a false positive
- Contact `#platform-engineering` to adjust the scan threshold

**Helm deploy fails**
- Helm's `--atomic` flag auto-rolls back
- Check pod events: `kubectl get events -n <namespace> --sort-by='.lastTimestamp'`
- Check pod logs: `kubectl logs <pod> -n <namespace> --previous`

**OIDC auth fails**
- Verify the IAM role ARN is correct in your workflow
- Verify the OIDC trust policy allows your repo/branch/tag
- Contact `#platform-engineering`
