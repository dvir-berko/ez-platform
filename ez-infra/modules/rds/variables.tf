variable "service_name"  { type = string }
variable "environment"   { type = string }
variable "vpc_id"        { type = string }
variable "subnet_ids"    { type = list(string) }

variable "app_security_group_ids" {
  description = "Security group IDs of EKS pods that need DB access"
  type        = list(string)
}

variable "engine"         { type = string; default = "postgres" }
variable "engine_version" { type = string; default = "15.5" }
variable "instance_class" { type = string; default = "db.t3.micro" }
variable "db_name"        { type = string }
variable "db_username"    { type = string; default = "appuser" }
variable "db_port"        { type = number; default = 5432 }

variable "allocated_storage"     { type = number; default = 20 }
variable "max_allocated_storage" { type = number; default = 100 }

variable "multi_az"  { type = bool; default = false }
variable "kms_key_arn" { type = string; default = "" }

variable "enhanced_monitoring_role_arn" {
  description = "IAM role ARN for RDS enhanced monitoring (prod only)"
  type        = string
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
