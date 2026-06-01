# Optional: RDS PostgreSQL instead of in-cluster PostgreSQL
# Uncomment to use managed database

# resource "aws_db_subnet_group" "swarmdev" {
#   name       = "swarmdev-db-subnet-group"
#   subnet_ids = module.vpc.private_subnets
#
#   tags = {
#     Name = "SwarmDev DB subnet group"
#   }
# }
#
# resource "aws_security_group" "rds" {
#   name_prefix = "swarmdev-rds"
#   vpc_id      = module.vpc.vpc_id
#
#   ingress {
#     from_port       = 5432
#     to_port         = 5432
#     protocol        = "tcp"
#     security_groups = [module.eks.cluster_security_group_id]
#   }
#
#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
#
#   tags = {
#     Name = "swarmdev-rds-sg"
#   }
# }
#
# resource "aws_db_instance" "swarmdev" {
#   identifier = "swarmdev-db"
#
#   engine            = "postgres"
#   engine_version    = "15"
#   instance_class    = "db.t3.medium"
#   allocated_storage = 20
#   storage_type      = "gp2"
#
#   db_name  = "swarmdev"
#   username = "swarmdev"
#   password = random_password.db_password.result
#
#   db_subnet_group_name   = aws_db_subnet_group.swarmdev.name
#   vpc_security_group_ids = [aws_security_group.rds.id]
#
#   multi_az               = false
#   publicly_accessible    = false
#   deletion_protection    = true
#   skip_final_snapshot    = false
#   final_snapshot_identifier = "swarmdev-final-snapshot"
#
#   backup_retention_period = 7
#   backup_window          = "03:00-04:00"
#   maintenance_window     = "Mon:04:00-Mon:05:00"
#
#   tags = {
#     Name = "swarmdev-db"
#   }
# }
#
# resource "random_password" "db_password" {
#   length           = 16
#   special          = true
#   override_special = "!#$%&*()-_=+[]{}<>:?"
# }
#
# output "db_endpoint" {
#   value = aws_db_instance.swarmdev.endpoint
# }
#
# output "db_password_secret_arn" {
#   value = aws_secretsmanager_secret.db_password.arn
# }
#
# resource "aws_secretsmanager_secret" "db_password" {
#   name_prefix = "swarmdev/db-password"
# }
#
# resource "aws_secretsmanager_secret_version" "db_password" {
#   secret_id     = aws_secretsmanager_secret.db_password.id
#   secret_string = jsonencode({ password = random_password.db_password.result })
# }
