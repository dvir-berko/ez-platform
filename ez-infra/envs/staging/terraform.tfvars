aws_region       = "us-east-1"
eks_cluster_name = "ez-staging"
github_org       = "dvir-berko"

# Add services here as they are onboarded via the EZ Portal
services = {
  "example-service" = {
    team = "platform"
  }
}

# One namespace per team
teams = {
  "platform" = { team_name = "platform" }
}
