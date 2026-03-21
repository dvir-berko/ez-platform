variable "repository_name" {
  description = "ECR repository name (e.g. my-org/my-service)"
  type        = string
}

variable "service_name" {
  description = "Service name for tagging"
  type        = string
}

variable "team" {
  description = "Owning team for tagging"
  type        = string
}

variable "max_image_count" {
  description = "Maximum number of tagged images to retain"
  type        = number
  default     = 50
}

variable "kms_key_arn" {
  description = "KMS key ARN for ECR encryption (empty = use AWS-managed key)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
