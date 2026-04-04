import { index, pgTable, text, timestamp, uuid, jsonb, numeric } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
export const issuePlans = pgTable("issue_plans", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"), // "draft" | "approved" | "rejected" | "superseded"
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    steps: jsonb("steps").$type().notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }),
    risks: jsonb("risks").$type(),
    successCriteria: jsonb("success_criteria").$type(),
    subDelegations: jsonb("sub_delegations").$type(),
    reviewedByUserId: text("reviewed_by_user_id"),
    reviewNote: text("review_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    companyIssueIdx: index("issue_plans_company_issue_idx").on(table.companyId, table.issueId),
    companyStatusIdx: index("issue_plans_company_status_idx").on(table.companyId, table.status),
    companyIdx: index("issue_plans_company_idx").on(table.companyId),
}));
//# sourceMappingURL=issue_plans.js.map