variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "swarmdev"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
}

variable "log_groups" {
  description = "List of log group names"
  type        = list(string)
  default     = ["web", "api", "orchestrator"]
}

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 7
}

variable "node_autoscaling_group_name" {
  description = "Node autoscaling group name"
  type        = string
  default     = ""
}

variable "db_instance_identifier" {
  description = "RDS instance identifier"
  type        = string
  default     = ""
}
