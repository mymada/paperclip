CREATE TABLE "company_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"issue_id" uuid,
	"rule" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"command" text NOT NULL,
	"args" text[] DEFAULT '{}' NOT NULL,
	"env" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "role_prompt" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "scopes" text[];--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "system_prompt" text;--> statement-breakpoint
ALTER TABLE "company_secrets" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "proof_requirement_tier" integer;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "review_iteration_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "resolution_payload" jsonb;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "proof_requirement_tier" integer;--> statement-breakpoint
ALTER TABLE "company_lessons" ADD CONSTRAINT "company_lessons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_lessons" ADD CONSTRAINT "company_lessons_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_lessons_company_idx" ON "company_lessons" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_lessons_status_idx" ON "company_lessons" USING btree ("status");