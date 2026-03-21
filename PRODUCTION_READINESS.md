# Production Readiness Checklist

Work through every item below before directing real users to the EZ Platform. Items are
ordered to match the dependency chain: AWS infrastructure first, cluster add-ons second,
GitHub configuration third, infra-repo GitOps fourth, application code last.

All commands referenced here are covered in detail in `.github/SETUP.md`.

---

## AWS Infrastructure

- [ ] VPC created with at least two public subnets and two private subnets across two
      Availability Zones. Public subnets tagged `kubernetes.io/role/elb=1`; private
      subnets tagged `kubernetes.io/role/internal-elb=1`.
- [ ] S3 bucket `ez-tf-state-dev` created (versioning enabled, server-side encryption
      enabled, all public access blocked).
- [ ] S3 bucket `ez-tf-state-prod` created (versioning enabled, server-side encryption
      enabled, all public access blocked).
- [ ] DynamoDB table `ez-tf-lock-dev` created (partition key: `LockID`, billing mode:
      PAY_PER_REQUEST).
- [ ] DynamoDB table `ez-tf-lock-prod` created (partition key: `LockID`, billing mode:
      PAY_PER_REQUEST).
- [ ] GitHub OIDC provider created in AWS IAM with URL
      `https://token.actions.githubusercontent.com`, client ID `sts.amazonaws.com`, and
      thumbprints `6938fd4d98bab03faadb97b34396831e3780aea1` (pre-2023) and
      `1c58a3a8518e8759bf075b76b750d4f2df264fcd` (2023+).
- [ ] EKS cluster `ez-dev` created and reachable (`kubectl get nodes`).
- [ ] EKS cluster `ez-staging` created and reachable (`kubectl get nodes`).
- [ ] EKS cluster `ez-prod` created and reachable (`kubectl get nodes`).
- [ ] ECR repository created for `ez-platform` (created by `terraform apply` in
      `ez-infra/envs/dev` and `ez-infra/envs/prod`).
- [ ] IAM CI role created (`*-ci-ez-platform`) — trusts `refs/heads/dev`,
      `refs/heads/staging`, and `refs/heads/main` (created by Terraform).
- [ ] IAM CD dev role created (`*-cd-dev-ez-platform`) — trusts `refs/heads/dev` only
      (created by Terraform).
- [ ] IAM CD staging role created (`*-cd-staging-ez-platform`) — trusts
      `refs/heads/staging` only (created by Terraform).
- [ ] IAM CD prod role created (`*-cd-prod-ez-platform`) — trusts `refs/tags/v*` only;
      never branches (created by Terraform).
- [ ] All four IAM role ARNs noted from `terraform output` and ready to be pasted into
      GitHub variables.
- [ ] ACM certificate requested for the production domain
      (e.g. `portal.example.com`) in the correct region.
- [ ] ACM certificate DNS validation CNAME record added to the DNS zone.
- [ ] ACM certificate status is `ISSUED`
      (`aws acm describe-certificate --certificate-arn <ARN>`).
- [ ] ACM certificate ARN added to `ez-platform/helm/values.prod.yaml` under
      `ingress.annotations.alb.ingress.kubernetes.io/certificate-arn`.

---

## Cluster Add-ons (repeat for each cluster: ez-dev, ez-staging, ez-prod)

- [ ] AWS Load Balancer Controller installed in `kube-system`
      (`kubectl get deployment aws-load-balancer-controller -n kube-system`).
- [ ] ALB Controller IRSA service account created and annotated with the correct IAM
      role ARN.
- [ ] `metrics-server` installed in `kube-system` and returning data
      (`kubectl top nodes`).
- [ ] External Secrets Operator installed in `external-secrets` namespace
      (`kubectl get deployment external-secrets -n external-secrets`).
- [ ] ESO IRSA service account created with `secretsmanager:GetSecretValue` permissions.
- [ ] `ClusterSecretStore` named `aws-secrets-manager` created and status is `Valid`
      (`kubectl get clustersecretstore aws-secrets-manager`).
- [ ] ArgoCD installed in `argocd` namespace
      (`kubectl get deployment argocd-server -n argocd`).
- [ ] ArgoCD initial admin password retrieved and changed or stored securely.
- [ ] ArgoCD has repository credentials configured for `https://github.com/dvir-berko/infra`
      (Settings > Repositories in the ArgoCD UI, or via `argocd repo add`).
- [ ] ArgoCD has repository credentials configured for
      `https://github.com/dvir-berko/ez-platform` (if private).
- [ ] Prometheus + Grafana (`kube-prometheus-stack`) installed in `monitoring` namespace
      (optional but strongly recommended for production).
- [ ] Grafana admin password changed from the default.
- [ ] Fluent Bit installed in `logging` namespace and shipping logs to CloudWatch
      (optional but strongly recommended for production).
- [ ] Fluent Bit IRSA service account created with CloudWatch `logs:PutLogEvents`
      permissions.

---

## GitHub Configuration

- [ ] GitHub OAuth App created under the correct GitHub organization or user account.
- [ ] OAuth App **Homepage URL** set to the production portal URL
      (e.g. `https://portal.example.com`).
- [ ] OAuth App **Authorization callback URL** set to
      `https://portal.example.com/api/auth/github/handler/frame` (must match
      `APP_BASE_URL` exactly, including scheme).
- [ ] OAuth App Client ID and Client Secret copied immediately after generation.
- [ ] Repository variable `AWS_ACCOUNT_ID` set (12-digit AWS account ID).
- [ ] Repository variable `AWS_REGION` set (e.g. `us-east-1`).
- [ ] Repository variable `EZ_PLATFORM_CI_ROLE_ARN` set to the ARN of the CI IAM role
      (used by the `build` job to push to ECR).
- [ ] Repository secret `AUTH_GITHUB_CLIENT_ID` set to the GitHub OAuth App Client ID.
- [ ] Repository secret `AUTH_GITHUB_CLIENT_SECRET` set to the GitHub OAuth App Client
      Secret.
- [ ] GitHub Environment `dev` created.
- [ ] GitHub Environment `dev` has variable `EKS_CLUSTER_NAME` = `ez-dev`.
- [ ] GitHub Environment `dev` has variable `EZ_PLATFORM_CD_ROLE_ARN` set to the ARN
      of the CD dev IAM role.
- [ ] GitHub Environment `staging` created.
- [ ] GitHub Environment `staging` has variable `EKS_CLUSTER_NAME` = `ez-staging`.
- [ ] GitHub Environment `staging` has variable `EZ_PLATFORM_CD_ROLE_ARN` set to the
      ARN of the CD staging IAM role.
- [ ] GitHub Environment `prod` created.
- [ ] GitHub Environment `prod` has variable `EKS_CLUSTER_NAME` = `ez-prod`.
- [ ] GitHub Environment `prod` has variable `EZ_PLATFORM_CD_ROLE_ARN` set to the ARN
      of the CD prod IAM role (trusted only for `refs/tags/v*`).
- [ ] GitHub Environment `prod` has at least one **required reviewer** configured
      (Settings > Environments > prod > Required reviewers). No prod deployment runs
      without explicit approval.
- [ ] (Optional) Repository variable `EZ_PLATFORM_PUBLIC_URL` set to the production
      URL (e.g. `https://portal.example.com`) to skip ALB hostname discovery.
- [ ] (Optional) Repository variable `K8S_NAMESPACE` set if using a non-default
      namespace (default is `ez-platform`).

---

## Infra Repository

- [ ] GitHub repository `dvir-berko/infra` exists and is accessible to ArgoCD.
- [ ] Directory structure `envs/dev/`, `envs/staging/`, `envs/prod/` created in the
      infra repo.
- [ ] `envs/dev/values.yaml` created with dev-specific Helm value overrides
      (image repository, tag, environment-specific settings).
- [ ] `envs/staging/values.yaml` created with staging-specific Helm value overrides.
- [ ] `envs/prod/values.yaml` created with prod-specific Helm value overrides,
      including the ACM certificate ARN annotation.
- [ ] `ez-infra/argocd/apps.yaml` updated: `repoURL` values match your actual GitHub
      org (replace `dvir-berko` if forked).
- [ ] `ez-infra/argocd/apps.yaml` updated: `targetRevision` for the infra repo pinned
      to a semver tag (e.g. `refs/tags/v1.0.0`) instead of `main` for all three
      Application resources. The `TODO` comments in the file identify these lines.
- [ ] ArgoCD Application manifests applied to the cluster:
      `kubectl apply -f ez-infra/argocd/apps.yaml`
- [ ] All three ArgoCD Applications visible in the UI:
      `ez-platform-dev`, `ez-platform-staging`, `ez-platform-prod`.
- [ ] `ez-platform-dev` sync policy is `Automated` (prune + self-heal).
- [ ] `ez-platform-staging` sync policy is `Automated` (prune + self-heal).
- [ ] `ez-platform-prod` sync policy is intentionally **not automated** (manual sync
      only, requiring a platform engineer to approve in ArgoCD after promotion).

---

## Code

- [ ] `EZHomePage` demo mode set to `false` (or real data sources connected) if you
      are using the default Backstage homepage with demo catalog entries.
- [ ] `POSTGRES_HOST` available in the `ez-platform-env` Kubernetes Secret (or
      injected via External Secrets Operator from AWS Secrets Manager) for the
      production database connection defined in `app-config.production.yaml`.
- [ ] `POSTGRES_PORT` available in the `ez-platform-env` Kubernetes Secret
      (default PostgreSQL port is `5432`).
- [ ] `POSTGRES_USER` available in the `ez-platform-env` Kubernetes Secret.
- [ ] `POSTGRES_PASSWORD` available in the `ez-platform-env` Kubernetes Secret.
      In production, provision this via the `ez-infra rds/` module and sync into
      the cluster with External Secrets Operator.
- [ ] Production Backstage backend is connecting to PostgreSQL (not SQLite). Confirm
      by checking the backend startup log for `Knex:pg` connection messages.
- [ ] `app-config.production.yaml` `backend.database.ssl.require: true` and
      `rejectUnauthorized: true` are both `true` (they are in the committed config;
      do not override them to `false`).

---

## Final Verification

- [ ] Workflow `ez-platform-deploy.yml` triggered manually for `dev` via
      `gh workflow run ez-platform-deploy.yml --field environment=dev`.
- [ ] `build` job completes: Backstage app compiled, Docker image pushed to ECR,
      Trivy scan ran (continue-on-error; review findings).
- [ ] `deploy` job completes: Helm upgrade succeeded with `--atomic --wait --timeout 10m`.
- [ ] `kubectl rollout status deployment/ez-platform -n ez-platform` exits 0.
- [ ] Pods are Running and Ready:
      `kubectl get pods -n ez-platform` shows all pods in `Running` state with
      `1/1` or `3/3` Ready.
- [ ] Ingress has an ALB hostname assigned:
      `kubectl get ingress ez-platform -n ez-platform` shows a non-empty `ADDRESS`.
- [ ] Backstage portal is accessible at the ALB URL (HTTP 200 or HTTPS redirect).
- [ ] GitHub login (OAuth) works: clicking "Sign in with GitHub" completes the OAuth
      flow and lands on the Backstage home page.
- [ ] Service catalog loads without errors: navigate to **Catalog** in the left sidebar.
- [ ] "Create" flow works end-to-end:
      - Click **Create** > choose **EZ Lite Service**.
      - Fill in the form and submit.
      - New GitHub repository is scaffolded.
      - CI pipeline triggers automatically on the new repo.
      - Service appears in the Backstage catalog.
- [ ] ArgoCD UI shows `ez-platform-dev` as `Synced` and `Healthy`.
- [ ] (Prod only) ArgoCD `ez-platform-prod` shows `Synced` and `Healthy` after
      manual sync following the promote-prod workflow.
- [ ] (Prod only) HTTPS is working end-to-end: `curl -I https://portal.example.com`
      returns `HTTP/2 200` with a valid TLS certificate from ACM.
- [ ] (Prod only) No HIGH or CRITICAL unfixed CVEs reported by Trivy in the latest
      image scan (review the GitHub Actions step summary or Security tab).
