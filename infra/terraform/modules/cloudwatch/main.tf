# ──────────────────────────────────────────────
# CloudWatch Module
# Creates log groups and alarms
# ──────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "app_logs" {
  for_each = toset(var.log_groups)

  name              = "/aws/eks/${var.cluster_name}/${each.value}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-${each.value}"
    Environment = var.environment
  }
}

# CPU High Alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization is above 80%"

  dimensions = {
    AutoScalingGroupName = var.node_autoscaling_group_name
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cpu-high"
    Environment = var.environment
  }
}

# RDS Free Storage Alarm
resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-free-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648 # 2GB in bytes
  alarm_description   = "RDS free storage is below 2GB"

  dimensions = {
    DBInstanceIdentifier = var.db_instance_identifier
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-free-storage"
    Environment = var.environment
  }
}
