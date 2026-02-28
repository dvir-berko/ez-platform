variable "namespace"   { type = string }
variable "team"        { type = string }
variable "environment" { type = string }

variable "quota_requests_cpu"    { type = string; default = "4" }
variable "quota_requests_memory" { type = string; default = "8Gi" }
variable "quota_limits_cpu"      { type = string; default = "16" }
variable "quota_limits_memory"   { type = string; default = "32Gi" }
variable "quota_max_pods"        { type = string; default = "50" }
