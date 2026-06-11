variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "swarmdev"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "bucket_suffix" {
  description = "Suffix for S3 bucket name"
  type        = string
  default     = "files"
}

variable "enable_versioning" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}
