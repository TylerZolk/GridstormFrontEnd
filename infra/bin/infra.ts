#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PolepadStack } from "../lib/polepad-stack";

const app = new cdk.App();
new PolepadStack(app, "PolepadStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
