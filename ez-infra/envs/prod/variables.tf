variable "aws_region"       { type = string; default = "us-east-1" }
variable "eks_cluster_name" { type = string; default = "ez-prod" }
variable "github_org"       { type = string }

variable "services" {
  type = map(object({ team = string }))
  default = {}
}

variable "teams" {
  type = map(object({
    team_name    = string
    quota_cpu    = optional(string)
    quota_memory = optional(string)
  }))
  default = {}
}
