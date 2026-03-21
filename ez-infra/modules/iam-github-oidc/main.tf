# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — GitHub OIDC IAM Module
#
# Creates IAM roles that GitHub Actions can assume via OIDC.
# No static AWS keys are created or stored.
#
# Usage: call once per environment per service (or per team).
# ─────────────────────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

# GitHub's OIDC provider (created once per account, shared)
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1", # GitHub OIDC cert (pre-2023)
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd", # GitHub OIDC cert (2023+)
  ]

  tags = var.tags
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? (
    aws_iam_openid_connect_provider.github[0].arn
  ) : var.existing_oidc_provider_arn

  eks_clusters = {
    for cluster_arn in var.eks_cluster_arns :
    split("/", cluster_arn)[1] => cluster_arn
  }

  eks_admin_policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy"
}

# ── CI Role (push to ECR) ────────────────────────────────────────────────────
resource "aws_iam_role" "ci" {
  name               = "${var.role_prefix}-ci-${var.service_name}"
  assume_role_policy = data.aws_iam_policy_document.ci_trust.json
  tags               = merge(var.tags, { "ez.platform/role-type" = "ci" })
}

data "aws_iam_policy_document" "ci_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_org}/${var.repo_name}:ref:refs/heads/dev",
        "repo:${var.github_org}/${var.repo_name}:ref:refs/heads/staging",
        "repo:${var.github_org}/${var.repo_name}:ref:refs/heads/main",
      ]
    }
  }
}

resource "aws_iam_role_policy" "ci_ecr" {
  name   = "ecr-push"
  role   = aws_iam_role.ci.id
  policy = data.aws_iam_policy_document.ci_ecr.json
}

data "aws_iam_policy_document" "ci_ecr" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
    ]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
    ]
    resources = var.ecr_repository_arns
  }
}

# ── CD Dev Role (deploy to dev EKS namespace) ─────────────────────────────────
resource "aws_iam_role" "cd_dev" {
  name               = "${var.role_prefix}-cd-dev-${var.service_name}"
  assume_role_policy = data.aws_iam_policy_document.cd_dev_trust.json
  tags               = merge(var.tags, { "ez.platform/role-type" = "cd-dev" })
}

data "aws_iam_policy_document" "cd_dev_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.repo_name}:ref:refs/heads/dev"]
    }
  }
}

# ── CD Staging Role (deploy to staging EKS namespace) ─────────────────────────
resource "aws_iam_role" "cd_staging" {
  name               = "${var.role_prefix}-cd-staging-${var.service_name}"
  assume_role_policy = data.aws_iam_policy_document.cd_staging_trust.json
  tags               = merge(var.tags, { "ez.platform/role-type" = "cd-staging" })
}

data "aws_iam_policy_document" "cd_staging_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.repo_name}:ref:refs/heads/staging"]
    }
  }
}

resource "aws_iam_role_policy" "cd_dev_eks" {
  name   = "eks-access"
  role   = aws_iam_role.cd_dev.id
  policy = data.aws_iam_policy_document.cd_eks.json
}

resource "aws_eks_access_entry" "cd_dev" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_dev.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "cd_dev_admin" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_dev.arn
  policy_arn    = local.eks_admin_policy_arn

  depends_on = [aws_eks_access_entry.cd_dev]

  access_scope {
    type = "cluster"
  }
}

resource "aws_iam_role_policy" "cd_staging_eks" {
  name   = "eks-access"
  role   = aws_iam_role.cd_staging.id
  policy = data.aws_iam_policy_document.cd_eks.json
}

resource "aws_eks_access_entry" "cd_staging" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_staging.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "cd_staging_admin" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_staging.arn
  policy_arn    = local.eks_admin_policy_arn

  depends_on = [aws_eks_access_entry.cd_staging]

  access_scope {
    type = "cluster"
  }
}

# ── CD Prod Role (deploy to prod EKS namespace) ───────────────────────────────
resource "aws_iam_role" "cd_prod" {
  name               = "${var.role_prefix}-cd-prod-${var.service_name}"
  assume_role_policy = data.aws_iam_policy_document.cd_prod_trust.json
  tags               = merge(var.tags, { "ez.platform/role-type" = "cd-prod" })
}

data "aws_iam_policy_document" "cd_prod_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      # Prod deploys from tags only
      values = ["repo:${var.github_org}/${var.repo_name}:ref:refs/tags/v*"]
    }
  }
}

resource "aws_iam_role_policy" "cd_prod_eks" {
  name   = "eks-access"
  role   = aws_iam_role.cd_prod.id
  policy = data.aws_iam_policy_document.cd_eks.json
}

resource "aws_eks_access_entry" "cd_prod" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_prod.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "cd_prod_admin" {
  for_each      = local.eks_clusters
  cluster_name  = each.key
  principal_arn = aws_iam_role.cd_prod.arn
  policy_arn    = local.eks_admin_policy_arn

  depends_on = [aws_eks_access_entry.cd_prod]

  access_scope {
    type = "cluster"
  }
}

data "aws_iam_policy_document" "cd_eks" {
  statement {
    effect    = "Allow"
    actions   = ["eks:DescribeCluster"]
    resources = var.eks_cluster_arns
  }
}
