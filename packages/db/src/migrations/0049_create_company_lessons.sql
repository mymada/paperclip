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
CREATE INDEX "company_lessons_company_idx" ON "company_lessons" ("company_id");
--> statement-breakpoint
CREATE INDEX "company_lessons_status_idx" ON "company_lessons" ("status");
--> statement-breakpoint
ALTER TABLE "company_lessons" ADD CONSTRAINT "company_lessons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_lessons" ADD CONSTRAINT "company_lessons_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;
