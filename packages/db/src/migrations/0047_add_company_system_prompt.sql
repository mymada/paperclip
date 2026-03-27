ALTER TABLE "agents" ADD COLUMN "role_prompt" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "system_prompt" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "depends_on_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_depends_on_issue_id_issues_id_fk" FOREIGN KEY ("depends_on_issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_company_depends_on_idx" ON "issues" USING btree ("company_id","depends_on_issue_id");