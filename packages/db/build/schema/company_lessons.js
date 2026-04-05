import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
export const companyLessons = pgTable("company_lessons", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    type: text("type").notNull().default("fact"), // "procedure" | "fact" | "antibody"
    rule: text("rule").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    companyIdx: index("company_lessons_company_idx").on(table.companyId),
    statusIdx: index("company_lessons_status_idx").on(table.status),
}));
//# sourceMappingURL=company_lessons.js.map