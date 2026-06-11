variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "swarmdev"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repository_names" {
  description = "List of repository names"
  type        = list(string)
  default     = ["web", "api", "orchestrator"]
}

variable "max_image_count" {
  description = "Maximum number of images to keep"
  type        = number
  default     = 30
}
