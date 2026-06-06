#!/usr/bin/env bash
# ─── AWS Infrastructure Setup Guide ────────────────────────────
# This script automates the setup of HIPAA-compliant AWS infrastructure.
# Run once during initial deployment.

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────
STACK_NAME="wholeness-grace"
AWS_REGION="${AWS_REGION:-us-east-1}"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_CIDR="10.0.1.0/24"
PRIVATE_SUBNET_CIDR="10.0.2.0/24"

echo "=== Wholeness and Grace — AWS Infrastructure Setup ==="
echo "Region: $AWS_REGION"
echo "Stack:   $STACK_NAME"
echo ""

# ─── Check prerequisites ──────────────────────────────────────
echo "1. Checking prerequisites..."

if ! command -v aws &> /dev/null; then
  echo "ERROR: AWS CLI is required. Install: pip install awscli"
  exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
  echo "ERROR: Not authenticated. Run 'aws configure' first."
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "   Account: $ACCOUNT_ID"
echo ""

# ─── VPC and Networking ───────────────────────────────────────
echo "2. Setting up VPC..."
VPC_ID=$(aws ec2 create-vpc --cidr-block "$VPC_CIDR" --query Vpc.VpcId --output text)
aws ec2 create-tags --resources "$VPC_ID" --tags Key=Name,Value="$STACK_NAME-vpc"
echo "   VPC: $VPC_ID"

# Internet gateway
IGW_ID=$(aws ec2 create-internet-gateway --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --vpc-id "$VPC_ID" --internet-gateway-id "$IGW_ID"
echo "   IGW: $IGW_ID"

# Subnets
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$PUBLIC_SUBNET_CIDR" --map-public-ip-on-launch --query Subnet.SubnetId --output text)
PRIVATE_SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$PRIVATE_SUBNET_CIDR" --query Subnet.SubnetId --output text)
aws ec2 create-tags --resources "$PUBLIC_SUBNET_ID" "$PRIVATE_SUBNET_ID" --tags Key=Name,Value="$STACK_NAME-subnet"
echo "   Public subnet:  $PUBLIC_SUBNET_ID"
echo "   Private subnet: $PRIVATE_SUBNET_ID"

# Route tables
RTB_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id "$RTB_ID" --destination-cidr-block "0.0.0.0/0" --gateway-id "$IGW_ID" > /dev/null
aws ec2 associate-route-table --route-table-id "$RTB_ID" --subnet-id "$PUBLIC_SUBNET_ID" > /dev/null
echo "   Route table: $RTB_ID"
echo ""

# ─── Security Groups ──────────────────────────────────────────
echo "3. Setting up security groups..."
ALB_SG_ID=$(aws ec2 create-security-group --group-name "$STACK_NAME-alb-sg" --description "ALB security group" --vpc-id "$VPC_ID" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG_ID" --protocol tcp --port 443 --cidr "0.0.0.0/0"
aws ec2 authorize-security-group-ingress --group-id "$ALB_SG_ID" --protocol tcp --port 80 --cidr "0.0.0.0/0"
echo "   ALB SG: $ALB_SG_ID"

ECS_SG_ID=$(aws ec2 create-security-group --group-name "$STACK_NAME-ecs-sg" --description "ECS security group" --vpc-id "$VPC_ID" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$ECS_SG_ID" --protocol tcp --port 3001 --source-group "$ALB_SG_ID"
echo "   ECS SG: $ECS_SG_ID"

RDS_SG_ID=$(aws ec2 create-security-group --group-name "$STACK_NAME-rds-sg" --description "RDS security group" --vpc-id "$VPC_ID" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$RDS_SG_ID" --protocol tcp --port 5432 --source-group "$ECS_SG_ID"
echo "   RDS SG: $RDS_SG_ID"
echo ""

# ─── RDS PostgreSQL ───────────────────────────────────────────
echo "4. Setting up RDS PostgreSQL..."
RDS_PASSWORD=$(openssl rand -base64 16)
aws rds create-db-instance \
  --db-instance-identifier "$STACK_NAME-db" \
  --db-instance-class db.t3.small \
  --engine postgres \
  --engine-version 16 \
  --master-username postgres \
  --master-user-password "$RDS_PASSWORD" \
  --allocated-storage 20 \
  --storage-encrypted \
  --vpc-security-group-ids "$RDS_SG_ID" \
  --db-subnet-group-name "$STACK_NAME-db-subnet" \
  --backup-retention-period 7 \
  --deletion-protection \
  --storage-type gp3 > /dev/null

echo "   RDS provisioning... (takes 5-10 minutes)"
echo "   Master password: $RDS_PASSWORD"
echo "   SAVE THIS PASSWORD SECURELY"
echo ""

# ─── ECR Repository ───────────────────────────────────────────
echo "5. Setting up ECR..."
aws ecr create-repository --repository-name "$STACK_NAME-api" --image-scanning-configuration scanOnPush=true --encryption-configuration encryptionType=AES256 > /dev/null
echo "   ECR repo: $STACK_NAME-api"
echo ""

# ─── S3 Bucket (Frontend) ─────────────────────────────────────
echo "6. Setting up S3 for frontend..."
aws s3api create-bucket --bucket "$STACK_NAME-frontend-$ACCOUNT_ID" --region "$AWS_REGION" --create-bucket-configuration LocationConstraint="$AWS_REGION"
aws s3api put-bucket-encryption --bucket "$STACK_NAME-frontend-$ACCOUNT_ID" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "$STACK_NAME-frontend-$ACCOUNT_ID" --public-access-block-configuration "BlockPublicAcls=true,BlockPublicPolicy=true,IgnorePublicAcls=true,RestrictPublicBuckets=true"
echo "   S3 bucket: $STACK_NAME-frontend-$ACCOUNT_ID"
echo ""

# ─── Summary ──────────────────────────────────────────────────
echo "=== AWS Infrastructure Setup Complete ==="
echo ""
echo "IMPORTANT: Next steps"
echo "1. Wait for RDS to finish provisioning:"
echo "   aws rds wait db-instance-available --db-instance-identifier $STACK_NAME-db"
echo ""
echo "2. Get the RDS endpoint:"
echo "   aws rds describe-db-instances --db-instance-identifier $STACK_NAME-db --query 'DBInstances[0].Endpoint.Address'"
echo ""
echo "3. Sign BAA with AWS (via AWS Artifact)"
echo "   https://us-east-1.console.aws.amazon.com/artifact"
echo ""
echo "4. Register domain and request ACM certificate"
echo ""
echo "5. Create ECS cluster and service, or launch EC2 instance"
echo ""
echo "6. Deploy the application:"
echo "   - Build Docker image and push to ECR"
echo "   - Run database migrations"
echo "   - Configure environment variables"
echo "   - Set up Application Load Balancer with HTTPS"