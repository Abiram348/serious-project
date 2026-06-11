variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "swarmdev"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "database_url" {
  description = "Database URL"
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Redis URL"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "orchestrator_secret" {
  description = "Orchestrator API secret"
  type        = string
  sensitive   = true
}

variable "ollama_base_url" {
  description = "Ollama base URL"
  type        = string
  default     = ""
}

variable "ollama_model" {
  description = "Ollama model"
  type        = string
  default     = "codellama"
}

variable "e2b_api_key" {
  description = "E2B API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "r2_endpoint" {
  description = "R2 endpoint"
  type        = string
  default     = ""
}

variable "r2_access_key_id" {
  description = "R2 access key ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "R2 secret access key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "r2_bucket_name" {
  description = "R2 bucket name"
  type        = string
  default     = ""
}
