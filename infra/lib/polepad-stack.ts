import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export class PolepadStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table
    const table = new dynamodb.Table(this, "SubmissionsTable", {
      tableName: "polepad-submissions",
      partitionKey: { name: "tagNumber", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "submittedAt", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: "byAuthor",
      partitionKey: { name: "submittedBy", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "submittedAt", type: dynamodb.AttributeType.STRING },
    });

    // S3 bucket
    const bucket = new s3.Bucket(this, "SubmissionsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          // Tighten to your Vercel domain in production (see AWS_SETUP_GUIDE.md)
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // DynamoDB table for users
    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "polepad-users",
      partitionKey: { name: "username", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // IAM user scoped to both tables + bucket
    const appUser = new iam.User(this, "PolepadAppUser", {
      userName: "polepad-app",
    });

    appUser.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
        ],
        resources: [
          table.tableArn,
          `${table.tableArn}/index/*`,
          usersTable.tableArn,
        ],
      })
    );

    appUser.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [`${bucket.bucketArn}/*`],
      })
    );

    const accessKey = new iam.CfnAccessKey(this, "PolepadAppUserKey", {
      userName: appUser.userName,
    });

    // Outputs — copy these into Vercel environment variables
    new cdk.CfnOutput(this, "TableName", { value: table.tableName });
    new cdk.CfnOutput(this, "UsersTableName", { value: usersTable.tableName });
    new cdk.CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "Region", { value: this.region });
    new cdk.CfnOutput(this, "AccessKeyId", { value: accessKey.ref });
    new cdk.CfnOutput(this, "SecretAccessKey", {
      value: accessKey.attrSecretAccessKey,
    });
  }
}
