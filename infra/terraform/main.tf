# SwarmDev Infrastructure on AWS
# Terraform configuration for EKS cluster deployment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket = "swarmdev-terraform-state"
    key    = "eks/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "SwarmDev"
      ManagedBy = "Terraform"
    }
  }
}

provider "kubernetes" {
  host                   = aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

# Random suffix for unique naming
resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

# VPC for EKS cluster
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "swarmdev-vpc-${random_string.suffix.result}"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "kubernetes.io/cluster/swarmdev-${random_string.suffix.result}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/cluster/swarmdev-${random_string.suffix.result}" = "shared"
    "kubernetes.io/role/elb"                                        = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/swarmdev-${random_string.suffix.result}" = "shared"
    "kubernetes.io/role/internal-elb"                               = "1"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name    = "swarmdev-${random_string.suffix.result}"
  cluster_version = "1.28"

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size     = 1
      max_size     = 5
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"

      tags = {
        Environment = "dev"
      }
    }

    compute = {
      min_size     = 1
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "SPOT"

      labels = {
        workload = "compute"
      }
    }
  }

  tags = {
    Environment = "dev"
  }
}

# Security group for EKS nodes
resource "aws_security_group" "eks_nodes" {
  name_prefix = "swarmdev-eks-nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    cidr_blocks = [
      "10.0.0.0/16"
    ]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "swarmdev-eks-nodes"
  }
}
