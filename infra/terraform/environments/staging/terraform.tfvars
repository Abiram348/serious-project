aws_region = "us-east-1"

# Strong password for the RDS database
db_password = "De0SrRwT3FdhCaGxEAML984gbWcfeU4PxpFVdrTrWI"

# Clerk (from apps/api/.env and apps/web/.env)
clerk_secret_key       = "sk_test_YOUR_CLERK_SECRET"
clerk_publishable_key  = "pk_test_YOUR_CLERK_PUBLISHABLE_KEY"

# Stripe (from apps/api/.env)
stripe_secret_key      = "sk_test_YOUR_STRIPE_SECRET"

# Orchestrator (from apps/api/.env)
orchestrator_secret    = "dev-secret"

# Ollama (from apps/orchestrator/.env)
ollama_base_url = "http://localhost:11434"
ollama_model    = "codellama"

# E2B (from apps/api/.env)
e2b_api_key = "e2b_YOUR_E2B_API_KEY"

# Cloudflare R2 (from apps/api/.env — update with your real keys)
r2_endpoint          = "https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
r2_access_key_id     = "YOUR_R2_ACCESS_KEY"
r2_secret_access_key = "YOUR_R2_SECRET_KEY"
