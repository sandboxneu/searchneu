# ================= RDS ===================
resource "aws_db_instance" "default" {
  identifier             = module.label.id
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "11.8"
  instance_class         = "db.t3.micro"
  name                   = module.label.name
  username               = "postgres"
  password               = random_password.db_pass.result
  parameter_group_name   = "default.postgres11"
  storage_encrypted      = true
  port                   = 5432
  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  skip_final_snapshot    = true
}

resource "random_password" "db_pass" {
  length = 16
}

resource "aws_db_subnet_group" "default" {
  name       = module.label.id
  subnet_ids = var.private_subnet_ids
}

# Traffic to Postgres should only allow from ECS
resource "aws_security_group" "postgres" {
  name = "${module.label.id}-postgres-security-group"

  description = "RDS postgres servers (terraform-managed)"
  vpc_id = var.vpc_id

  # Only postgres in from ECS
  ingress {
    protocol = "tcp"
    from_port = 5432
    to_port = 5432
    security_groups = [aws_security_group.ecs_tasks.id, var.jumphost_sg_id]
  }

  # Allow all outbound traffic.
  egress {
    protocol = "-1"
    from_port = 0
    to_port = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}
