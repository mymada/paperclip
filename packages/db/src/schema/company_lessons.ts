import { pgTable, uuid, text, timestamp, index, customType } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

// Custom type for pgvector
const vector = customType<{ data: number[] }>({
  dataType(config) {
    const dimensions = (config as any)?.dimensions ?? 1536;
    return `vector(${dimensions})`;
  },
});

export const companyLessons = pgTable(
  "company_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    rule: text("rule").notNull(),
    status: text("status").notNull().default("draft"),
    embedding: vector("embedding", { dimensions: 1536 } as any),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("company_lessons_company_idx").on(table.companyId),
    statusIdx: index("company_lessons_status_idx").on(table.status),
  }),
);
