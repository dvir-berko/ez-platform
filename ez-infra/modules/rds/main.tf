# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — RDS Module (Standard Tier)
#
# Creates:
#   - RDS Postgres / MySQL instance
#   - DB subnet group
#   - Security group (app pods → DB only)
#   - Secrets Manager secret (connection string)
#   - Random password rotation
# ─────────────────────────────────────────────────────────────────────────────

resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "this" {
  name        = "${var.service_name}-${var.environment}"
  description = "EZ DB subnet group for ${var.service_name} (${var.environment})"
  subnet_ids  = var.subnet_ids

  tags = merge(var.tags, {
    "ez.platform/service"     = var.service_name
    "ez.platform/environment" = var.environment
  })
}

resource "aws_security_group" "db" {
  name        = "${var.service_name}-db-${var.environment}"
  description = "Allow inbound from ${var.service_name} pods"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = var.app_security_group_ids
    description     = "Allow ${var.service_name} pods to reach DB"
  }


  tags = merge(var.tags, {
    "ez.platform/service" = var.service_name
  })
}

resource "aws_db_instance" "this" {
  identifier = "${var.service_name}-${var.environment}"

  engine         = var.engine
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn != "" ? var.kms_key_arn : null

  multi_az                  = var.multi_az
  publicly_accessible       = false
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.service_name}-${var.environment}-final" : null

  backup_retention_period = var.environment == "prod" ? 7 : 1
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  performance_insights_enabled          = var.environment == "prod"
  performance_insights_retention_period = var.environment == "prod" ? 7 : null
  monitoring_interval                   = var.environment == "prod" ? 60 : 0
  monitoring_role_arn                   = var.environment == "prod" ? var.enhanced_monitoring_role_arn : null

  tags = merge(var.tags, {
    "ez.platform/service"     = var.service_name
    "ez.platform/environment" = var.environment
    "ez.platform/tier"        = "standard"
  })
}

# Store connection string in Secrets Manager
resource "aws_secretsmanager_secret" "db" {
  name        = "${var.service_name}/${var.environment}/app"
  description = "DB credentials for ${var.service_name} (${var.environment})"
  kms_key_id  = var.kms_key_arn != "" ? var.kms_key_arn : null

  tags = merge(var.tags, {
    "ez.platform/service"     = var.service_name
    "ez.platform/environment" = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    database_url = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.this.endpoint}/${var.db_name}"
    host         = aws_db_instance.this.address
    port         = aws_db_instance.this.port
    username     = var.db_username
    password     = random_password.db.result
    db_name      = var.db_name
  })

  lifecycle {
    ignore_changes = [secret_string] # Don't overwrite on rotation
  }
}
