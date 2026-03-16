variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "eks_cluster_name" {
  type    = string
  default = "ez-staging"
}

variable "github_org" {
  type = string
}

variable "services" {
  description = "Map of service name → config to onboard"
  type = map(object({
    team = string
  }))
  default = {}
}

variable "teams" {
  description = "Map of namespace name → team config"
  type = map(object({
    team_name = string
  }))
  default = {}
}
