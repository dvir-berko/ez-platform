aws_region       = "us-east-1"
eks_cluster_name = "ez-prod"
github_org       = "your-org"

services = {
  "example-service" = {
    team = "platform"
  }
}

teams = {
  "platform" = {
    team_name    = "platform"
    quota_cpu    = "16"
    quota_memory = "32Gi"
  }
}
