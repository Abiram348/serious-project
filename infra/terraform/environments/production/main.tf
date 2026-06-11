terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "swarmdev-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "swarmdev-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "swarmdev"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  cluster_name = "swarmdev-production"
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  project_name = "swarmdev"
  environment  = "production"
  cluster_name = local.cluster_name
  vpc_cidr     = "10.0.0.0/16"
  az_count     = 3
}

# EKS
module "eks" {
  source = "../../modules/eks"

  project_name       = "swarmdev"
  environment        = "production"
  cluster_name       = local.cluster_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  kubernetes_version   = "1.30"
  node_instance_types  = ["m6i.xlarge"]
  node_desired_size    = 3
  node_min_size        = 2
  node_max_size        = 10
  node_capacity_type   = "ON_DEMAND"
  log_retention_days   = 30
}

# RDS
module "rds" {
  source = "../../modules/rds"

  project_name         = "swarmdev"
  environment          = "production"
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]

  instance_class       = "db.r6g.large"
  allocated_storage    = 100
  db_name              = "swarmdev"
  db_username          = "orchestrator"
  db_password          = var.db_password
  multi_az             = true
  backup_retention_period = 30
  performance_insights_enabled = true
  deletion_protection  = true
}

# ElastiCache
module "elasticache" {
  source = "../../modules/elasticache"

  project_name         = "swarmdev"
  environment          = "production"
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]

  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2
  automatic_failover_enabled = true
  multi_az_enabled     = true
}

# ECR
module "ecr" {
  source = "../../modules/ecr"

  project_name   = "swarmdev"
  environment    = "production"
  max_image_count = 50
}

# S3
module "s3" {
  source = "../../modules/s3"

  project_name    = "swarmdev"
  environment     = "production"
  bucket_suffix   = "files"
  enable_versioning = true
}

# Secrets Manager
module "secrets" {
  source = "../../modules/secrets-manager"

  project_name = "swarmdev"
  environment  = "production"

  database_url                  = "postgres://${module.rds.db_instance_address}:5432/swarmdev"
  redis_url                     = "redis://${module.elasticache.redis_endpoint}:6379"
  clerk_secret_key              = var.clerk_secret_key
  clerk_publishable_key         = var.clerk_publishable_key
  stripe_secret_key             = var.stripe_secret_key
  orchestrator_secret           = var.orchestrator_secret
  ollama_base_url               = var.ollama_base_url
  ollama_model                  = var.ollama_model
  e2b_api_key                   = var.e2b_api_key
  r2_endpoint                   = var.r2_endpoint
  r2_access_key_id              = var.r2_access_key_id
  r2_secret_access_key          = var.r2_secret_access_key
  r2_bucket_name                = module.s3.bucket_id
}

# CloudWatch
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  project_name            = "swarmdev"
  environment             = "production"
  cluster_name            = local.cluster_name
  log_groups              = ["web", "api", "orchestrator"]
  log_retention_days      = 30
  db_instance_identifier  = module.rds.db_instance_arn
}
