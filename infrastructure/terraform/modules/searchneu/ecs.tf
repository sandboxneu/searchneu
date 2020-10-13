# =================== ECS ==================
resource "aws_ecs_cluster" "main" {
  name = module.label.id
}

# ========= Web server ============= 
module "webserver-container" {
  source          = "git::https://github.com/cloudposse/terraform-aws-ecs-container-definition.git?ref=0.23.0"
  container_name  = "${module.label.id}-webserver"
  container_image = "${var.ecr_url}:${module.label.stage}"
  container_cpu   = var.webapp_cpu
  container_memory= var.webapp_memory

  log_configuration = {
    logDriver = "awslogs"
    options = {
      awslogs-group         = "/ecs/${module.label.id}"
      awslogs-region        = var.aws_region
      awslogs-stream-prefix = "webserver"
    }
    secretOptions = null
  }

  port_mappings   = [
    {
      containerPort = var.app_port
      hostPort      = var.app_port
      protocol      = "tcp"
    }
  ]
  
  secrets = local.secretsFrom
}

resource "aws_ecs_task_definition" "webserver" {
  family                   = "${module.label.id}-webserver"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.webapp_cpu
  memory                   = var.webapp_memory
  container_definitions    = module.webserver-container.json
}

resource "aws_ecs_service" "main" {
  name            = "${module.label.id}-webserver"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.webserver.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = var.public_subnet_ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.webserver.arn
    container_name   = "${module.label.id}-webserver"
    container_port   = var.app_port
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role]
}

# ======== Scraper ===========

module "scrape-container" {
  source          = "git::https://github.com/cloudposse/terraform-aws-ecs-container-definition.git?ref=0.23.0"
  container_name  = "${module.label.id}-scrape"
  container_image = "${var.ecr_url}:${module.label.stage}"
  container_cpu   = var.scrape_cpu
  container_memory= var.scrape_memory

  command         = ["yarn", "prod:scrape"]

  log_configuration = {
    logDriver = "awslogs"
    options = {
      awslogs-group         = "/ecs/${module.label.id}"
      awslogs-region        = var.aws_region
      awslogs-stream-prefix = "scrape"
    }
    secretOptions = null
  }
  
  secrets = local.secretsFrom
}

resource "aws_ecs_task_definition" "scrape" {
  family                   = "${module.label.id}-scrape"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.scrape_cpu
  memory                   = var.scrape_memory
  container_definitions    = module.scrape-container.json
}

module "scrape-scheduled-task" {
  source  = "baikonur-oss/fargate-scheduled-task/aws"
  version = "v2.0.2"

  name                = "${module.label.id}-scrape"
  schedule_expression = "cron(0 0 * * ? *)"
  is_enabled          = "true"

  target_cluster_arn = aws_ecs_cluster.main.id

  execution_role_arn  = aws_iam_role.ecs_task_execution_role.arn

  task_definition_arn = aws_ecs_task_definition.scrape.arn
  task_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_count          = "1"

  subnet_ids         = var.public_subnet_ids
  security_group_ids = [aws_security_group.ecs_tasks.id]
}

# =============== Updater service ================

module "update-container" {
  source          = "git::https://github.com/cloudposse/terraform-aws-ecs-container-definition.git?ref=0.23.0"
  container_name  = "${module.label.id}-update"
  container_image = "${var.ecr_url}:${module.label.stage}"
  container_cpu   = var.webapp_cpu
  container_memory= var.webapp_memory

  command         = ["yarn", "prod:start:updater"]

  log_configuration = {
    logDriver = "awslogs"
    options = {
      awslogs-group         = "/ecs/${module.label.id}"
      awslogs-region        = var.aws_region
      awslogs-stream-prefix = "update"
    }
    secretOptions = null
  }
  
  secrets = local.secretsFrom
}

resource "aws_ecs_task_definition" "update" {
  family                   = "${module.label.id}-update"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.webapp_cpu
  memory                   = var.webapp_memory
  container_definitions    = module.update-container.json
}

resource "aws_ecs_service" "update" {
  name            = "${module.label.id}-update"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.update.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = var.public_subnet_ids
    assign_public_ip = true
  }
  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution_role]
}

# =============== Secrets ==================

locals {
  all_secrets_unsorted = concat(var.secrets, [
    # {
    #   name        = "elasticURL"
    #   value       = "https://${module.elasticsearch.domain_endpoint}"
    #   description = "Elasticsearch hostname"
    # },
    {
      name        = "dbUsername"
      value       = aws_db_instance.default.username
      description = "Postgres database username"
    },
    {
      name        = "dbPassword"
      value       = aws_db_instance.default.password
      description = "Postgres database password"
    },
    {
      name        = "dbName"
      value       = aws_db_instance.default.name
      description = "Postgres database name"
    },
    {
      name        = "dbHost"
      value       = aws_db_instance.default.address
      description = "Postgres database host"
    },
    {
      name        = "DATABASE_URL"
      value       = aws_db_instance.default.address
      description = "Postgres database URL"
    }
  ])
  # For some insane reason the secrets list is unstable. We have to sort it to prevent recreating the params every time.
  all_secrets_keys = [for s in local.all_secrets_unsorted : lookup(s, "name")]
  all_secrets_name_map = zipmap(local.all_secrets_keys, local.all_secrets_unsorted)
  all_secrets = [
    for key in sort(local.all_secrets_keys): 
    {
      name = key
      value = lookup(lookup(local.all_secrets_name_map, key), "value")
      description = lookup(lookup(local.all_secrets_name_map, key), "description")
    }
  ]
  # Secrets object that can be given to container definitions
  secretsFrom = [
    for ssmParam in aws_ssm_parameter.default:
    {
      name = split("/", ssmParam.name)[2]
      valueFrom = ssmParam.arn
    }
  ]
}
# Secrets to put in env
# Maybe use a KMS for better security?
# Also this module https://github.com/cloudposse/terraform-aws-ssm-parameter-store is nice but not up to date with Terraform 0.12
resource "aws_ssm_parameter" "default" {
  count           = length(var.secrets) + 5
  name            = "/${var.stage}/${lookup(local.all_secrets[count.index], "name")}"
  description     = lookup(local.all_secrets[count.index], "description", lookup(local.all_secrets[count.index], "name"))
  type            = "SecureString"
  value           = lookup(local.all_secrets[count.index], "value")
  overwrite       = lookup(local.all_secrets[count.index], "overwrite", "true")
  depends_on      = [module.elasticsearch, aws_db_instance.default]
}

# ============= Logs =================
# Set up CloudWatch group and log stream and retain logs for 30 days
resource "aws_cloudwatch_log_group" "default_log_group" {
  name              = "/ecs/${module.label.id}"
  retention_in_days = 30

  tags = {
    Name = "${module.label.id}-log-group"
  }
}

resource "aws_cloudwatch_log_stream" "default_log_stream" {
  name           = "${module.label.id}-log-stream"
  log_group_name = aws_cloudwatch_log_group.default_log_group.name
}

# ================ IAM =========================
# ECS task execution role data
data "aws_iam_policy_document" "ecs_task_execution_role" {
  version = "2012-10-17"
  statement {
    sid     = ""
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ECS task execution role
resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "${module.label.id}-task-exec-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_role.json
}

# ECS task execution role policy attachment
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Let ECS read SSM parameters
resource "aws_iam_role_policy_attachment" "ssm_readonly" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}


# Traffic to the ECS cluster should only come from the ALB
resource "aws_security_group" "ecs_tasks" {
  name        = "${module.label.id}-ecs-tasks-security-group"
  description = "allow inbound access from the ALB only"
  vpc_id      = var.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = var.app_port
    to_port         = var.app_port
    security_groups = [var.alb_sg_id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}
