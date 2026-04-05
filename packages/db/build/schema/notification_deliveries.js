import { index, pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { notificationRules } from "./notification_rules.js";
export const notificationDeliveries = pgTable("notification_deliveries", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    ruleId: uuid("rule_id").references(() => notificationRules.id, { onDelete: "set null" }),
    triggerType: text("trigger_type").notNull(),
    payload: jsonb("payload").$type(),
    renderedMessage: text("rendered_message").notNull(),
    deliveryTarget: text("delivery_target").notNull(),
    targetConfig: jsonb("target_config").$type(),
    status: text("status").notNull().default("pending"), // "pending" | "sent" | "failed"
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    companyStatusIdx: index("notification_deliveries_company_status_idx").on(table.companyId, table.status),
    companyRuleIdx: index("notification_deliveries_company_rule_idx").on(table.companyId, table.ruleId),
    companyIdx: index("notification_deliveries_company_idx").on(table.companyId),
}));
//# sourceMappingURL=notification_deliveries.js.map