# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — Prod Environment
#
# Identical structure to dev but:
#   - Points to prod EKS cluster
#   - RDS multi_az = true
#   - deletion_protection = true on databases
#   - Terraform apply requires GitHub Environment "prod" approval
#
# State: s3://ez-tf-state-prod/envs/prod/terraform.tfstate
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

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "ez.platform/environment" = "prod"
      "ez.platform/managed-by"  = "terraform"
      "ez.platform/repo"        = "ez-infra"
    }
  }
}

data "aws_eks_cluster" "prod" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "prod" {
  name = var.eks_cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.prod.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.prod.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.prod.token
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

module "services" {
  for_each = var.services
  source   = "../../modules/ecr"

  repository_name = "${var.github_org}/${each.key}"
  service_name    = each.key
  team            = each.value.team
  max_image_count = 100  # Keep more images in prod

  ci_role_arns = [module.iam_roles[each.key].ci_role_arn]
}

module "iam_roles" {
  for_each = var.services
  source   = "../../modules/iam-github-oidc"

  service_name               = each.key
  github_org                 = var.github_org
  repo_name                  = each.key
  create_oidc_provider       = false
  existing_oidc_provider_arn = data.aws_iam_openid_connect_provider.github.arn

  ecr_repository_arns = [module.services[each.key].repository_arn]
  eks_cluster_arns    = [data.aws_eks_cluster.prod.arn]
}

module "namespaces" {
  for_each = var.teams
  source   = "../../modules/eks-namespace"

  namespace             = each.key
  team                  = each.value.team_name
  environment           = "prod"
  quota_requests_cpu    = each.value.quota_cpu    != null ? each.value.quota_cpu    : "8"
  quota_requests_memory = each.value.quota_memory != null ? each.value.quota_memory : "16Gi"
}
