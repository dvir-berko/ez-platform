output "ci_role_arn" {
  description = "ARN of the CI IAM role (ECR push)"
  value       = aws_iam_role.ci.arn
}

output "cd_dev_role_arn" {
  description = "ARN of the CD dev IAM role"
  value       = aws_iam_role.cd_dev.arn
}

output "cd_prod_role_arn" {
  description = "ARN of the CD prod IAM role"
  value       = aws_iam_role.cd_prod.arn
}
