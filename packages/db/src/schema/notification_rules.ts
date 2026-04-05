import { index, pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { channelConnections } from "./channel_connections.js";

export const notificationRules = pgTable(
  "notification_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    triggerType: text("trigger_type").notNull(), // "heartbeat.completed" | "heartbeat.failed" | "issue.completed" | "issue.stuck" | "budget.exceeded" | "delegation.escalated" | "plan.approved" | "plan.rejected"
    conditions: jsonb("conditions").$type<{
      agentId?: string;
      projectId?: string;
      minCostUsd?: number;
    }>(),
    channelConnectionId: uuid("channel_connection_id").references(() => channelConnections.id, { onDelete: "set null" }),
    deliveryTarget: text("delivery_target").notNull(), // "channel" | "email" | "log"
    targetConfig: jsonb("target_config").$type<{
      email?: string;
      chatId?: string;
      agentId?: string;
    }>(),
    messageTemplate: text("message_template").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyTriggerEnabledIdx: index("notification_rules_company_trigger_enabled_idx").on(table.companyId, table.triggerType, table.enabled),
    companyIdx: index("notification_rules_company_idx").on(table.companyId),
  }),
);