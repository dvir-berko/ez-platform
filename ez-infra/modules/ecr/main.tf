# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — ECR Module
#
# Creates an ECR repository with:
#   - Image scanning on push
#   - Lifecycle policy (clean old images)
#   - KMS encryption
#   - Repository policy scoped to CI role
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = "IMMUTABLE"  # Immutable tags = reproducible deploys

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn != "" ? var.kms_key_arn : null
  }

  tags = merge(var.tags, {
    "ez.platform/service" = var.service_name
    "ez.platform/team"    = var.team
    "ez.platform/managed" = "true"
  })
}

# Lifecycle policy: keep last N images, expire old ones
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.max_image_count} images tagged with env prefixes or semver"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-", "v", "dev-", "staging-", "prod-"]
          countType     = "imageCountMoreThan"
          countNumber   = var.max_image_count
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      }
    ]
  })
}

# Repository policy: allow CI role to push, allow CD roles to pull
resource "aws_ecr_repository_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCIPush"
        Effect = "Allow"
        Principal = {
          AWS = var.ci_role_arns
        }
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
      },
      {
        Sid    = "AllowCDPull"
        Effect = "Allow"
        Principal = {
          AWS = var.cd_role_arns
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:DescribeImages",
        ]
      },
    ]
  })
}
