CREATE EXTENSION IF NOT EXISTS plpgsql;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_clerkId_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"agentRunId" text NOT NULL,
	"level" text DEFAULT 'INFO',
	"message" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"agentType" text,
	"status" text DEFAULT 'IDLE',
	"input" jsonb,
	"output" jsonb,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"errorMsg" text,
	"tokenUsed" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "build_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"stream" text,
	"exitCode" integer,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"role" text,
	"agentType" text,
	"content" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_files" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"path" text NOT NULL,
	"content" text,
	"language" text,
	"createdBy" text,
	"version" integer DEFAULT 1,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'PENDING',
	"techStack" jsonb,
	"sandboxId" text,
	"previewUrl" text,
	"githubRepo" text,
	"deployUrl" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"stripeCustomerId" text,
	"stripePriceId" text,
	"stripeSubId" text,
	"status" text,
	"currentPeriodEnd" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text,
	"agentType" text,
	"tokensIn" integer DEFAULT 0,
	"tokensOut" integer DEFAULT 0,
	"cost" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerkId" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatarUrl" text,
	"plan" text DEFAULT 'FREE',
	"credits" integer DEFAULT 100 NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
