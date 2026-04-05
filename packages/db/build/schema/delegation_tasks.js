import { index, pgTable, text, timestamp, uuid, jsonb, numeric, integer } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
export const delegationTasks = pgTable("delegation_tasks", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    rootTaskId: uuid("root_task_id").references(() => issues.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references(() => issues.id, { onDelete: "set null" }),
    delegatedByAgentId: uuid("delegated_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    assignedAgentId: uuid("assigned_agent_id").references(() => agents.id, { onDelete: "set null" }),
    goal: text("goal").notNull(),
    contextPacket: jsonb("context_packet").$type().notNull(),
    expectedOutputSchema: jsonb("expected_output_schema").$type(),
    allowedTools: jsonb("allowed_tools").$type(),
    budgetCap: numeric("budget_cap", { precision: 10, scale: 4 }),
    budgetSpent: numeric("budget_spent", { precision: 10, scale: 4 }).default("0"),
    depth: integer("depth").notNull().default(0),
    maxDepth: integer("max_depth").notNull().default(3),
    priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high" | "urgent"
    status: text("status").notNull().default("pending"), // "pending" | "claimed" | "in_progress" | "completed" | "failed" | "cancelled"
    escalationPolicy: text("escalation_policy").default("parent"), // "parent" | "manager" | "none"
    resultSummary: jsonb("result_summary").$type(),
    costSpent: numeric("cost_spent", { precision: 10, scale: 4 }).default("0"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    companyStatusIdx: index("delegation_tasks_company_status_idx").on(table.companyId, table.status),
    companyAgentStatusIdx: index("delegation_tasks_company_agent_status_idx").on(table.companyId, table.assignedAgentId, table.status),
    companyRootTaskIdx: index("delegation_tasks_company_root_task_idx").on(table.companyId, table.rootTaskId),
    companyIdx: index("delegation_tasks_company_idx").on(table.companyId),
}));
//# sourceMappingURL=delegation_tasks.js.map