variable "service_name" {
  description = "Service name (used for role naming)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
}

variable "repo_name" {
  description = "GitHub repository name"
  type        = string
}

variable "role_prefix" {
  description = "Prefix for IAM role names (e.g. 'ez')"
  type        = string
  default     = "ez"
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider (set false if already exists in account)"
  type        = bool
  default     = false
}

variable "existing_oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider (used when create_oidc_provider=false)"
  type        = string
  default     = ""
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs that the CI role may push to"
  type        = list(string)
}

variable "eks_cluster_arns" {
  description = "EKS cluster ARNs that CD roles may describe"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
