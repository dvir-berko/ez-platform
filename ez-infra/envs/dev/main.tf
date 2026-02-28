# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — Dev Environment
#
# Manages shared dev infrastructure:
#   - GitHub OIDC provider (shared across all services)
#   - Per-service ECR repos + IAM roles
#   - EKS namespaces per team
#
# State: s3://ez-tf-state-dev/envs/dev/terraform.tfstate
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    # Configured via -backend-config in CI (see terraform-reusable.yml)
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "ez.platform/environment" = "dev"
      "ez.platform/managed-by"  = "terraform"
      "ez.platform/repo"        = "ez-infra"
    }
  }
}

data "aws_eks_cluster" "dev" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "dev" {
  name = var.eks_cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.dev.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.dev.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.dev.token
}

# ── GitHub OIDC Provider (created once per account) ──────────────────────────
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = { Name = "github-actions-oidc" }
}

# ── Services ──────────────────────────────────────────────────────────────────
# Each service calls the ECR and OIDC modules.
# Add a new block here when onboarding a service.
module "services" {
  for_each = var.services
  source   = "../../modules/ecr"

  repository_name = "${var.github_org}/${each.key}"
  service_name    = each.key
  team            = each.value.team

  ci_role_arns = [
    module.iam_roles[each.key].ci_role_arn
  ]
}

module "iam_roles" {
  for_each = var.services
  source   = "../../modules/iam-github-oidc"

  service_name               = each.key
  github_org                 = var.github_org
  repo_name                  = each.key
  create_oidc_provider       = false
  existing_oidc_provider_arn = aws_iam_openid_connect_provider.github.arn

  ecr_repository_arns = [module.services[each.key].repository_arn]
  eks_cluster_arns    = [data.aws_eks_cluster.dev.arn]

  tags = { "ez.platform/service" = each.key }
}

# ── Namespaces ────────────────────────────────────────────────────────────────
module "namespaces" {
  for_each = var.teams
  source   = "../../modules/eks-namespace"

  namespace   = each.key
  team        = each.value.team_name
  environment = "dev"
}
