# ──────────────────────────────────────────────
# Secrets Manager Module
# Creates and manages application secrets
# ──────────────────────────────────────────────

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/app"
  description             = "Application secrets for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL                  = var.database_url
    REDIS_URL                     = var.redis_url
    CLERK_SECRET_KEY              = var.clerk_secret_key
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
    STRIPE_SECRET_KEY             = var.stripe_secret_key
    ORCHESTRATOR_SECRET           = var.orchestrator_secret
    OLLAMA_BASE_URL               = var.ollama_base_url
    OLLAMA_MODEL                  = var.ollama_model
    E2B_API_KEY                   = var.e2b_api_key
    R2_ENDPOINT                   = var.r2_endpoint
    R2_ACCESS_KEY_ID              = var.r2_access_key_id
    R2_SECRET_ACCESS_KEY          = var.r2_secret_access_key
    R2_BUCKET_NAME                = var.r2_bucket_name
  })
}
