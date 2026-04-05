CREATE TABLE "issue_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid,
	"agent_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"steps" jsonb NOT NULL,
	"estimated_cost_usd" numeric(12, 6),
	"risks" jsonb,
	"success_criteria" jsonb,
	"sub_delegations" jsonb,
	"reviewed_by_user_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"heartbeat_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delegation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"root_task_id" uuid,
	"parent_task_id" uuid,
	"delegated_by_agent_id" uuid,
	"assigned_agent_id" uuid,
	"goal" text NOT NULL,
	"context_packet" jsonb NOT NULL,
	"expected_output_schema" jsonb,
	"allowed_tools" jsonb,
	"budget_cap" numeric(10, 4),
	"budget_spent" numeric(10, 4) DEFAULT '0',
	"depth" integer DEFAULT 0 NOT NULL,
	"max_depth" integer DEFAULT 3 NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"escalation_policy" text DEFAULT 'parent',
	"result_summary" jsonb,
	"cost_spent" numeric(10, 4) DEFAULT '0',
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"heartbeat_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"conditions" jsonb,
	"channel_connection_id" uuid,
	"delivery_target" text NOT NULL,
	"target_config" jsonb,
	"message_template" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"rule_id" uuid,
	"trigger_type" text NOT NULL,
	"payload" jsonb,
	"rendered_message" text NOT NULL,
	"delivery_target" text NOT NULL,
	"target_config" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "issue_plans_company_issue_idx" ON "issue_plans" ("company_id","issue_id");
--> statement-breakpoint
CREATE INDEX "issue_plans_company_status_idx" ON "issue_plans" ("company_id","status");
--> statement-breakpoint
CREATE INDEX "issue_plans_company_idx" ON "issue_plans" ("company_id");
--> statement-breakpoint
CREATE INDEX "delegation_tasks_company_status_idx" ON "delegation_tasks" ("company_id","status");
--> statement-breakpoint
CREATE INDEX "delegation_tasks_company_agent_status_idx" ON "delegation_tasks" ("company_id","assigned_agent_id","status");
--> statement-breakpoint
CREATE INDEX "delegation_tasks_company_root_task_idx" ON "delegation_tasks" ("company_id","root_task_id");
--> statement-breakpoint
CREATE INDEX "delegation_tasks_company_idx" ON "delegation_tasks" ("company_id");
--> statement-breakpoint
CREATE INDEX "notification_rules_company_trigger_enabled_idx" ON "notification_rules" ("company_id","trigger_type","enabled");
--> statement-breakpoint
CREATE INDEX "notification_rules_company_idx" ON "notification_rules" ("company_id");
--> statement-breakpoint
CREATE INDEX "notification_deliveries_company_status_idx" ON "notification_deliveries" ("company_id","status");
--> statement-breakpoint
CREATE INDEX "notification_deliveries_company_rule_idx" ON "notification_deliveries" ("company_id","rule_id");
--> statement-breakpoint
CREATE INDEX "notification_deliveries_company_idx" ON "notification_deliveries" ("company_id");
--> statement-breakpoint
ALTER TABLE "issue_plans" ADD CONSTRAINT "issue_plans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_plans" ADD CONSTRAINT "issue_plans_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_plans" ADD CONSTRAINT "issue_plans_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "issue_plans" ADD CONSTRAINT "issue_plans_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_root_task_id_issues_id_fk" FOREIGN KEY ("root_task_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_parent_task_id_issues_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_delegated_by_agent_id_agents_id_fk" FOREIGN KEY ("delegated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delegation_tasks" ADD CONSTRAINT "delegation_tasks_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_channel_connection_id_channel_connections_id_fk" FOREIGN KEY ("channel_connection_id") REFERENCES "public"."channel_connections"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_rule_id_notification_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."notification_rules"("id") ON DELETE set null ON UPDATE no action;