# EZ Platform — Complete Setup and Deployment Guide

This guide walks a platform engineer through standing up the EZ Platform from scratch:
provisioning AWS infrastructure, installing cluster add-ons, wiring GitHub, and running
the first deployment.

**Estimated total time:** 2–4 hours for a first-time setup.

**Prerequisites on your workstation:**
- AWS CLI v2 (`aws --version`)
- Terraform >= 1.7 (`terraform version`)
- kubectl >= 1.28 (`kubectl version --client`)
- Helm >= 3.14 (`helm version`)
- GitHub CLI (`gh --version`)

---

## Section 1: AWS Prerequisites

### 1.1 Create a VPC

The EZ Platform runs on EKS. Create a VPC with at least two public and two private subnets
across two Availability Zones. The public subnets host the AWS Load Balancer; the private
subnets host EKS node groups.

```bash
# Example — adjust CIDR blocks and AZs to match your account
export AWS_REGION=us-east-1

VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --region "$AWS_REGION" \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=ez-vpc}]' \
  --query 'Vpc.VpcId' --output text)

aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support

# Create an Internet Gateway for public subnets
IGW_ID=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID"

echo "VPC: $VPC_ID  IGW: $IGW_ID"
```

Create four subnets — two public (for ALB) and two private (for EKS nodes).
Tag the public subnets so the AWS Load Balancer Controller can discover them:

```bash
# Public subnet — AZ a
PUBLIC_A=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.1.0/24 \
  --availability-zone "${AWS_REGION}a" \
  --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PUBLIC_A" --tags \
  Key=Name,Value=ez-public-a \
  Key=kubernetes.io/role/elb,Value=1

# Public subnet — AZ b
PUBLIC_B=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.2.0/24 \
  --availability-zone "${AWS_REGION}b" \
  --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PUBLIC_B" --tags \
  Key=Name,Value=ez-public-b \
  Key=kubernetes.io/role/elb,Value=1

# Private subnet — AZ a
PRIVATE_A=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.10.0/24 \
  --availability-zone "${AWS_REGION}a" \
  --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PRIVATE_A" --tags \
  Key=Name,Value=ez-private-a \
  Key=kubernetes.io/role/internal-elb,Value=1

# Private subnet — AZ b
PRIVATE_B=$(aws ec2 create-subnet \
  --vpc-id "$VPC_ID" \
  --cidr-block 10.0.11.0/24 \
  --availability-zone "${AWS_REGION}b" \
  --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources "$PRIVATE_B" --tags \
  Key=Name,Value=ez-private-b \
  Key=kubernetes.io/role/internal-elb,Value=1
```

You also need NAT Gateways (one per AZ) so private-subnet nodes can reach the internet,
and route tables associating public subnets to the IGW and private subnets to the NAT
Gateways. Refer to the AWS VPC documentation or use an existing VPC Terraform module.

### 1.2 Create S3 State Buckets and DynamoDB Lock Tables

Terraform state is stored in S3 with DynamoDB locking. These buckets must exist before
running `terraform init`. The bucket names are fixed in the backend configuration:

| Environment | S3 Bucket          | DynamoDB Table    |
|-------------|-------------------|-------------------|
| dev         | `ez-tf-state-dev` | `ez-tf-lock-dev`  |
| prod        | `ez-tf-state-prod`| `ez-tf-lock-prod` |

```bash
for ENV in dev prod; do
  BUCKET="ez-tf-state-${ENV}"
  TABLE="ez-tf-lock-${ENV}"

  # Create bucket
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"

  # Enable versioning
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  # Block all public access
  aws s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,\
BlockPublicPolicy=true,RestrictPublicBuckets=true

  # Enable server-side encryption
  aws s3api put-bucket-encryption \
    --bucket "$BUCKET" \
    --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

  # Create DynamoDB lock table
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$AWS_REGION"

  echo "Created: s3://$BUCKET  and  DynamoDB table $TABLE"
done
```

> Note: If your account is in `us-east-1`, omit `--create-bucket-configuration` from the
> `create-bucket` call (us-east-1 is the default and does not accept a LocationConstraint).

### 1.3 Create the GitHub OIDC Provider

The OIDC provider allows GitHub Actions to authenticate to AWS without static access keys.
This is created once per AWS account. The `ez-infra/envs/dev/main.tf` Terraform creates it
automatically, but you can also pre-create it manually:

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list \
    "6938fd4d98bab03faadb97b34396831e3780aea1" \
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
```

The two thumbprints cover the GitHub OIDC certificate before and after their 2023 rotation.

> If you let Terraform create the OIDC provider (via `create_oidc_provider = true`),
> skip this step for the dev environment. For prod, `envs/prod/main.tf` reads the
> existing provider via a `data` source, so the provider must already exist.

### 1.4 Create EKS Clusters

Three clusters are expected: `ez-dev`, `ez-staging`, and `ez-prod`. The Terraform modules
reference these names in `variables.tf` defaults. Create each cluster with at minimum two
node groups across two AZs.

**Recommended node sizes:**

| Cluster     | Node Type      | Min | Max | Notes                             |
|-------------|---------------|-----|-----|-----------------------------------|
| `ez-dev`    | `t3.medium`   | 2   | 4   | Cost-optimised for development    |
| `ez-staging`| `t3.large`    | 2   | 4   | Mirrors prod resource profile     |
| `ez-prod`   | `m5.large`    | 3   | 10  | Matches prod Helm values (3 pods, HPA to 10) |

```bash
for CLUSTER in ez-dev ez-staging ez-prod; do
  eksctl create cluster \
    --name "$CLUSTER" \
    --region "$AWS_REGION" \
    --vpc-id "$VPC_ID" \
    --version 1.30 \
    --nodegroup-name general \
    --node-type t3.large \
    --nodes 2 \
    --nodes-min 2 \
    --nodes-max 4 \
    --node-private-networking \
    --subnets "$PRIVATE_A,$PRIVATE_B" \
    --managed
done
```

> If you prefer the AWS Console or CloudFormation, ensure you tag private subnets with
> `kubernetes.io/cluster/<cluster-name>=owned` and enable the EKS cluster's OIDC issuer
> (required for IRSA and ESO).

---

## Section 2: Run Terraform

### 2.1 Configure your working environment

```bash
export AWS_REGION=us-east-1
export GITHUB_ORG=dvir-berko   # replace with your GitHub org/user
```

### 2.2 Dev environment

```bash
cd ez-infra/envs/dev

# Initialise with the S3 backend
terraform init \
  -backend-config="bucket=ez-tf-state-dev" \
  -backend-config="key=envs/dev/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=ez-tf-lock-dev" \
  -backend-config="encrypt=true"

# Review the plan
terraform plan \
  -var="aws_region=${AWS_REGION}" \
  -var="eks_cluster_name=ez-dev" \
  -var="github_org=${GITHUB_ORG}"

# Apply
terraform apply \
  -var="aws_region=${AWS_REGION}" \
  -var="eks_cluster_name=ez-dev" \
  -var="github_org=${GITHUB_ORG}"
```

### 2.3 Staging environment

```bash
cd ez-infra/envs/staging

terraform init \
  -backend-config="bucket=ez-tf-state-dev" \
  -backend-config="key=envs/staging/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=ez-tf-lock-dev" \
  -backend-config="encrypt=true"

terraform apply \
  -var="aws_region=${AWS_REGION}" \
  -var="eks_cluster_name=ez-staging" \
  -var="github_org=${GITHUB_ORG}"
```

### 2.4 Prod environment

```bash
cd ez-infra/envs/prod

terraform init \
  -backend-config="bucket=ez-tf-state-prod" \
  -backend-config="key=envs/prod/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=ez-tf-lock-prod" \
  -backend-config="encrypt=true"

terraform apply \
  -var="aws_region=${AWS_REGION}" \
  -var="eks_cluster_name=ez-prod" \
  -var="github_org=${GITHUB_ORG}"
```

### 2.5 Collect IAM role ARN outputs

After `terraform apply` completes, collect the IAM role ARNs that GitHub Actions needs.
The `iam_roles` module outputs four ARNs per service:

```bash
# From the dev environment
cd ez-infra/envs/dev
terraform output -json | jq '.'

# The four ARNs per service are named:
#   module.iam_roles["<service>"].ci_role_arn
#   module.iam_roles["<service>"].cd_dev_role_arn
#   module.iam_roles["<service>"].cd_staging_role_arn
#   module.iam_roles["<service>"].cd_prod_role_arn

# To get a specific ARN:
terraform output -raw \
  'module.iam_roles["ez-platform"].ci_role_arn'
```

Note these ARNs — you will add them to GitHub repository variables in Section 4.

The IAM role naming convention (from the Terraform module) is:
- CI role: `<role_prefix>-ci-<service_name>`
- CD dev: `<role_prefix>-cd-dev-<service_name>`
- CD staging: `<role_prefix>-cd-staging-<service_name>`
- CD prod: `<role_prefix>-cd-prod-<service_name>`

**Important OIDC trust boundaries:**
- CI role: trusted on `refs/heads/dev`, `refs/heads/staging`, and `refs/heads/main`
- CD dev role: trusted on `refs/heads/dev` only
- CD staging role: trusted on `refs/heads/staging` only
- CD prod role: trusted on `refs/tags/v*` only (version tags, never branches)

---

## Section 3: Install Cluster Add-ons

Repeat these steps for each cluster (`ez-dev`, `ez-staging`, `ez-prod`) unless stated
otherwise. Set your kubeconfig before proceeding:

```bash
CLUSTER=ez-dev   # repeat for ez-staging and ez-prod
aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER"
```

### 3.1 AWS Load Balancer Controller

The ALB Controller is required for the `alb` ingress class used by the Helm chart.

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the IAM policy (download the official policy document)
curl -o alb-iam-policy.json \
  https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://alb-iam-policy.json

# Create IRSA service account
eksctl create iamserviceaccount \
  --cluster="$CLUSTER" \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name "AmazonEKSLoadBalancerControllerRole-${CLUSTER}" \
  --attach-policy-arn \
    "arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy" \
  --approve \
  --region "$AWS_REGION"

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="$CLUSTER" \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --version 1.7.2

# Verify
kubectl get deployment aws-load-balancer-controller -n kube-system
```

### 3.2 metrics-server

Required for Horizontal Pod Autoscaler (HPA). The prod Helm values enable HPA with
a max of 10 replicas targeting 70% CPU.

```bash
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update

helm install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args="{--kubelet-insecure-tls}"

# Verify
kubectl top nodes
```

### 3.3 External Secrets Operator

ESO syncs secrets from AWS Secrets Manager into Kubernetes Secrets.

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --version 0.9.13

kubectl rollout status deployment/external-secrets -n external-secrets
```

#### Create the ClusterSecretStore

ESO needs an IAM role (with `secretsmanager:GetSecretValue`) that it can assume via IRSA.
Create the role, then apply the `ClusterSecretStore`:

```bash
# Create IRSA service account for ESO
eksctl create iamserviceaccount \
  --cluster="$CLUSTER" \
  --namespace=external-secrets \
  --name=external-secrets \
  --role-name "ExternalSecretsRole-${CLUSTER}" \
  --attach-policy-arn \
    arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve \
  --region "$AWS_REGION"

ESO_ROLE_ARN=$(aws iam get-role \
  --role-name "ExternalSecretsRole-${CLUSTER}" \
  --query 'Role.Arn' --output text)

kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: ${AWS_REGION}
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
EOF
```

Verify the store is ready:

```bash
kubectl get clustersecretstore aws-secrets-manager
# STATUS should be: Valid
```

### 3.4 ArgoCD

ArgoCD manages GitOps deployments. Dev and staging use automated sync; prod requires
manual sync.

```bash
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm install argocd argo/argo-cd \
  --namespace argocd \
  --version 6.7.14 \
  --set server.service.type=LoadBalancer \
  --set configs.params."server\.insecure"=true

kubectl rollout status deployment/argocd-server -n argocd

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath='{.data.password}' | base64 -d; echo
```

#### Give ArgoCD access to the infra repo

If `dvir-berko/infra` is a private repository, add a deploy key or GitHub App credential
to ArgoCD:

```bash
# Using the ArgoCD CLI
argocd login <ARGOCD_SERVER_URL> --username admin --password <INITIAL_PASSWORD>

argocd repo add https://github.com/dvir-berko/infra \
  --username git \
  --password <GITHUB_PAT_OR_DEPLOY_KEY>
```

Alternatively, add the repository via the ArgoCD UI under Settings > Repositories.

### 3.5 Prometheus and Grafana (kube-prometheus-stack)

Provides cluster metrics and dashboards. The Helm chart's `serviceMonitor.enabled` flag
integrates EZ Platform with this stack.

```bash
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --version 58.2.1 \
  --set grafana.adminPassword=changeme \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

kubectl rollout status deployment/kube-prometheus-stack-grafana -n monitoring
```

To expose Grafana locally:

```bash
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring
# Open http://localhost:3001  admin / changeme
```

### 3.6 Fluent Bit (log shipping to CloudWatch)

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create IAM policy for CloudWatch
aws iam create-policy \
  --policy-name FluentBitCloudWatchPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }]
  }'

eksctl create iamserviceaccount \
  --cluster="$CLUSTER" \
  --namespace=logging \
  --name=fluent-bit \
  --role-name "FluentBitRole-${CLUSTER}" \
  --attach-policy-arn \
    "arn:aws:iam::${AWS_ACCOUNT_ID}:policy/FluentBitCloudWatchPolicy" \
  --approve \
  --region "$AWS_REGION"

helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

helm install fluent-bit fluent/fluent-bit \
  --namespace logging \
  --create-namespace \
  --version 0.46.7 \
  --set serviceAccount.create=false \
  --set serviceAccount.name=fluent-bit \
  --set config.outputs="\
[OUTPUT]\n\
    Name cloudwatch_logs\n\
    Match *\n\
    region ${AWS_REGION}\n\
    log_group_name /eks/${CLUSTER}/containers\n\
    log_stream_prefix from-fluent-bit-\n\
    auto_create_group On"

kubectl rollout status daemonset/fluent-bit -n logging
```

---

## Section 4: GitHub Repository Configuration

### 4.1 Required Repository Variables and Secrets

All names are **case-sensitive** and must match exactly as shown. Configure these at the
repository level under **Settings > Secrets and variables > Actions**.

#### Repository Variables (`vars.*` in the workflow)

| Variable Name                | Required | Description                                                                 | Example Value                                         |
|------------------------------|----------|-----------------------------------------------------------------------------|-------------------------------------------------------|
| `AWS_ACCOUNT_ID`             | Yes      | Your 12-digit AWS account ID. Used to construct the ECR registry URL.       | `123456789012`                                        |
| `AWS_REGION`                 | Yes      | AWS region where EKS and ECR live. Defaults to `us-east-1` if unset.       | `us-east-1`                                           |
| `EKS_CLUSTER_NAME`           | Yes      | Name of the EKS cluster to deploy to. Set per GitHub Environment (see 4.3). | `ez-dev` / `ez-staging` / `ez-prod`                  |
| `K8S_NAMESPACE`              | No       | Kubernetes namespace. Defaults to `ez-platform` if unset.                  | `ez-platform`                                         |
| `EZ_PLATFORM_CI_ROLE_ARN`   | Yes      | ARN of the CI IAM role (ECR push). Assumed during the `build` job.         | `arn:aws:iam::123456789012:role/ez-ci-ez-platform`   |
| `EZ_PLATFORM_CD_ROLE_ARN`   | Yes      | ARN of the CD IAM role (EKS deploy). Assumed during the `deploy` job. Set per environment. | `arn:aws:iam::123456789012:role/ez-cd-dev-ez-platform` |
| `EZ_PLATFORM_PUBLIC_URL`    | No       | If set, skips ALB hostname discovery and uses this URL directly for `APP_BASE_URL` and `BACKEND_BASE_URL`. | `https://portal.example.com`                         |
| `EZ_PLATFORM_ECR_REPOSITORY`| No       | Overrides the ECR repository path. Defaults to `<github_org>/<repo_name>`. | `dvir-berko/ez-platform`                             |

#### Repository Secrets (`secrets.*` in the workflow)

| Secret Name                  | Required | Description                                                   |
|------------------------------|----------|---------------------------------------------------------------|
| `AUTH_GITHUB_CLIENT_ID`      | Yes      | Client ID of your GitHub OAuth App (see 4.2). Injected into the `ez-platform-env` Kubernetes Secret. |
| `AUTH_GITHUB_CLIENT_SECRET`  | Yes      | Client secret of your GitHub OAuth App. Injected into the `ez-platform-env` Kubernetes Secret. |

#### Setting variables and secrets via GitHub CLI

```bash
# Repository variables
gh variable set AWS_ACCOUNT_ID       --body "123456789012"
gh variable set AWS_REGION           --body "us-east-1"
gh variable set EZ_PLATFORM_CI_ROLE_ARN \
  --body "arn:aws:iam::123456789012:role/ez-ci-ez-platform"

# Secrets
gh secret set AUTH_GITHUB_CLIENT_ID     --body "<client-id>"
gh secret set AUTH_GITHUB_CLIENT_SECRET --body "<client-secret>"
```

Environment-scoped variables (e.g. `EKS_CLUSTER_NAME` and `EZ_PLATFORM_CD_ROLE_ARN`
differ per environment) must be set on each GitHub Environment separately (see 4.3).

### 4.2 Create the GitHub OAuth App

Backstage uses GitHub OAuth for user authentication. The client ID and secret are stored
in the `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` secrets above.

**Step-by-step:**

1. Go to **GitHub.com > Settings > Developer settings > OAuth Apps > New OAuth App**
   (or the equivalent URL for your GitHub organization:
   `https://github.com/organizations/<org>/settings/applications`).

2. Fill in the form:
   - **Application name:** `EZ Platform Portal` (or any descriptive name)
   - **Homepage URL:** `https://portal.example.com` (your public URL, or the ALB DNS
     name; can be updated later)
   - **Authorization callback URL:** `https://portal.example.com/api/auth/github/handler/frame`
     Replace the hostname with your actual `EZ_PLATFORM_PUBLIC_URL`. If using the raw
     ALB hostname, use `http://<alb-dns-name>/api/auth/github/handler/frame`.

3. Click **Register application**.

4. On the next screen, click **Generate a new client secret**.

5. Copy the **Client ID** and the **Client secret** immediately (the secret is shown
   only once) and store them in the GitHub secrets as described in 4.1.

> **Important:** The callback URL in the OAuth App must exactly match the `baseUrl`
> configured in `app-config.production.yaml`. The workflow injects `APP_BASE_URL` at
> deploy time from `EZ_PLATFORM_PUBLIC_URL` or the discovered ALB hostname.

### 4.3 Configure GitHub Environments

The workflow uses `environment: ${{ needs.prepare.outputs.environment }}` in the `deploy`
job. GitHub Environments gate deployments and allow environment-scoped variables and
secrets.

**Create three environments: `dev`, `staging`, and `prod`.**

```bash
# Using the GitHub API via gh CLI
for ENV in dev staging prod; do
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/{owner}/{repo}/environments/${ENV}"
done
```

Or use the GitHub UI: **Settings > Environments > New environment**.

**Configure environment-scoped variables on each environment:**

```bash
# dev environment
gh variable set EKS_CLUSTER_NAME \
  --env dev --body "ez-dev"
gh variable set EZ_PLATFORM_CD_ROLE_ARN \
  --env dev \
  --body "arn:aws:iam::123456789012:role/ez-cd-dev-ez-platform"

# staging environment
gh variable set EKS_CLUSTER_NAME \
  --env staging --body "ez-staging"
gh variable set EZ_PLATFORM_CD_ROLE_ARN \
  --env staging \
  --body "arn:aws:iam::123456789012:role/ez-cd-staging-ez-platform"

# prod environment
gh variable set EKS_CLUSTER_NAME \
  --env prod --body "ez-prod"
gh variable set EZ_PLATFORM_CD_ROLE_ARN \
  --env prod \
  --body "arn:aws:iam::123456789012:role/ez-cd-prod-ez-platform"
```

**Add required reviewers to the `prod` environment** (approval gate before prod deploy):

1. Go to **Settings > Environments > prod > Required reviewers**.
2. Add at least one GitHub user or team (e.g. `platform-engineering`).
3. Click **Save protection rules**.

This ensures no production deployment runs without a human approval, matching the IAM
trust policy restriction that the prod CD role only trusts `refs/tags/v*` refs.

---

## Section 5: ACM Certificate

The Helm chart's ingress is pre-configured for HTTPS with the annotation
`alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'` and an SSL
redirect from port 80 to 443. For HTTPS to work, you must provision an ACM certificate
and attach its ARN to the ingress annotations.

### 5.1 Request a certificate

```bash
DOMAIN=portal.example.com   # replace with your actual domain

CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region "$AWS_REGION" \
  --query 'CertificateArn' --output text)

echo "Certificate ARN: $CERT_ARN"
```

### 5.2 Validate via DNS

```bash
# Get the CNAME record to add to your DNS provider
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$AWS_REGION" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the returned `Name` → `Value` CNAME record to your DNS zone. Validation usually
completes within a few minutes. Wait until the status shows `ISSUED`:

```bash
aws acm wait certificate-validated \
  --certificate-arn "$CERT_ARN" \
  --region "$AWS_REGION"
```

### 5.3 Add the certificate ARN to Helm values

Open `ez-platform/helm/values.prod.yaml` and add the `certificate-arn` annotation
under the ingress section:

```yaml
ingress:
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

The base `values.yaml` already includes:
```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
alb.ingress.kubernetes.io/ssl-redirect: '443'
alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06
```

Commit and push this change to the `main` branch to trigger re-deployment, or set
`EZ_PLATFORM_PUBLIC_URL` to your HTTPS domain before the first deploy.

---

## Section 6: First Deployment

### 6.1 Verify prerequisites

Run through this checklist before triggering the workflow:

```bash
# 1. Confirm AWS identity
aws sts get-caller-identity

# 2. Confirm EKS connectivity
aws eks update-kubeconfig --region "$AWS_REGION" --name ez-dev
kubectl get nodes

# 3. Confirm ALB controller is running
kubectl get deployment aws-load-balancer-controller -n kube-system

# 4. Confirm ECR repository exists
aws ecr describe-repositories \
  --repository-names "dvir-berko/ez-platform" \
  --region "$AWS_REGION"

# 5. Confirm GitHub secrets are set
gh secret list

# 6. Confirm GitHub variables are set
gh variable list
```

### 6.2 Apply the ArgoCD Application manifests

The ArgoCD `Application` manifests for dev, staging, and prod are stored in
`ez-infra/argocd/apps.yaml`. Apply them to the cluster where ArgoCD is installed:

```bash
aws eks update-kubeconfig --region "$AWS_REGION" --name ez-dev

kubectl apply -f ez-infra/argocd/apps.yaml
```

Verify the Applications were created:

```bash
kubectl get applications -n argocd
```

You should see `ez-platform-dev`, `ez-platform-staging`, and `ez-platform-prod`.

> Before applying, update the `repoURL` values in `apps.yaml` to point to your forks
> if you have changed the GitHub org from `dvir-berko`. Also pin `targetRevision` away
> from `main` to a semver tag (e.g. `refs/tags/v1.0.0`) as noted by the `TODO` comments
> in the file.

### 6.3 Trigger the workflow

**Option A — Automatic trigger:**
Push any change to a file under `ez-platform/**` on the `main` branch. The workflow
will automatically deploy to `dev`.

**Option B — Manual dispatch (recommended for first deploy):**

```bash
# Deploy to dev
gh workflow run ez-platform-deploy.yml \
  --field environment=dev

# Deploy to staging
gh workflow run ez-platform-deploy.yml \
  --field environment=staging

# Deploy to prod (will prompt for approval from required reviewers)
gh workflow run ez-platform-deploy.yml \
  --field environment=prod
```

### 6.4 Monitor the deployment

```bash
# Watch the workflow run in real time
gh run watch

# Or list recent runs
gh run list --workflow=ez-platform-deploy.yml
```

In the GitHub UI, navigate to **Actions > Deploy EZ Platform** to see the live log.

The workflow steps in order are:
1. `prepare` — determines target environment
2. `build` — installs dependencies, builds Backstage, pushes Docker image to ECR, runs Trivy scan
3. `deploy` — assumes CD role, updates kubeconfig, creates `ez-platform-env` secret, runs Helm upgrade, verifies rollout

### 6.5 Monitor Kubernetes rollout

```bash
aws eks update-kubeconfig --region "$AWS_REGION" --name ez-dev

# Watch pods come up
kubectl get pods -n ez-platform -w

# Check deployment status
kubectl rollout status deployment/ez-platform -n ez-platform --timeout=300s

# Check ingress and ALB hostname
kubectl get ingress -n ez-platform
```

The `ADDRESS` field of the ingress will show the ALB DNS hostname once the load balancer
has been provisioned (typically 1–3 minutes after the ingress is created).

### 6.6 Verify Backstage is accessible

```bash
# Get the ALB hostname
ALB_HOSTNAME=$(kubectl get ingress ez-platform \
  -n ez-platform \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Backstage URL: http://${ALB_HOSTNAME}"
curl -I "http://${ALB_HOSTNAME}"
# Expect HTTP/1.1 200 OK or a redirect to HTTPS
```

Open the URL in a browser. You should see the Backstage sign-in page.

---

## Section 7: Post-Deployment

### 7.1 Access Backstage

| Environment | URL Source                                     |
|-------------|------------------------------------------------|
| dev         | ALB DNS hostname from `kubectl get ingress`    |
| staging     | ALB DNS hostname from `kubectl get ingress`    |
| prod        | `EZ_PLATFORM_PUBLIC_URL` or ALB DNS hostname   |

Sign in with your GitHub account. The GitHub OAuth callback must match the URL you
registered in the OAuth App (Section 4.2).

If you see an authentication error, confirm:
- `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` in the `ez-platform-env`
  Kubernetes secret match your OAuth App credentials.
- The callback URL in the GitHub OAuth App matches `<PUBLIC_URL>/api/auth/github/handler/frame`.

```bash
# Inspect the secret (values are base64-encoded)
kubectl get secret ez-platform-env -n ez-platform -o yaml
```

### 7.2 Create your first service via a Scaffolder template

1. Sign in to the EZ Portal.
2. Click **Create** in the left sidebar.
3. Choose a template:
   - **EZ Lite Service** — stateless REST API/worker, no database
   - **EZ Standard Service** — service with RDS Postgres/MySQL and Secrets Manager
4. Fill in the form:
   - Service name (e.g. `my-service`)
   - Team name (must match a namespace defined in `ez-infra/envs/dev/terraform.tfvars`)
   - AWS account ID, region, EKS cluster names
   - ECR repository name
   - CI and CD IAM role ARNs (from Terraform output in Section 2.5)
5. Click **Create**. Backstage scaffolds a new GitHub repository, registers it in the
   catalog, and triggers the first CI run automatically.

Watch the new repo's **Actions** tab to see the pipeline run.

### 7.3 Monitor via ArgoCD

```bash
# Get the ArgoCD server URL
kubectl get svc argocd-server -n argocd

# Port-forward if not exposed externally
kubectl port-forward svc/argocd-server 8080:80 -n argocd
# Open http://localhost:8080
```

In the ArgoCD UI:
- `ez-platform-dev` and `ez-platform-staging` have automated sync enabled (prune + self-heal).
  Any change pushed to the service repo or infra repo will reconcile automatically.
- `ez-platform-prod` has **no automated sync**. After the promote-prod workflow patches
  `envs/prod/values.yaml` in the infra repo, a platform engineer must manually sync in
  the ArgoCD UI or via `argocd app sync ez-platform-prod`.

```bash
# Sync prod manually via CLI
argocd app sync ez-platform-prod
argocd app wait ez-platform-prod --health
```

### 7.4 Day-2 operations

**Scale the portal:**
```bash
kubectl scale deployment ez-platform --replicas=2 -n ez-platform
# Or edit values.prod.yaml and re-deploy
```

**View logs:**
```bash
kubectl logs -l app.kubernetes.io/name=ez-platform -n ez-platform --follow
```

**View Backstage backend metrics (if Prometheus is installed):**

Enable `serviceMonitor.enabled: true` in the Helm values and redeploy. The portal's
`/metrics` endpoint is scraped automatically.

**Add a new service to infrastructure:**

Edit `ez-infra/envs/dev/terraform.tfvars`:
```hcl
services = {
  "my-new-service" = {
    team = "my-team"
  }
}
```
Open a PR — Terraform plan runs automatically. Merge to create the ECR repo and IAM roles.
