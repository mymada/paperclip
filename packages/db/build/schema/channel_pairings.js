import { pgTable, uuid, text, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { channelConnections } from "./channel_connections.js";
export const channelPairings = pgTable("channel_pairings", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    connectionId: uuid("connection_id").notNull().references(() => channelConnections.id),
    platform: text("platform").notNull(),
    userId: text("user_id").notNull(),
    code: text("code").notNull(),
    status: text("status").notNull().default("pending"),
    failedAttempts: integer("failed_attempts").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    approvedByUserId: text("approved_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    platformUserIdx: index("channel_pairings_platform_user_idx").on(table.platform, table.userId),
    codeIdx: unique("channel_pairings_code_unq").on(table.code),
    companyIdx: index("channel_pairings_company_idx").on(table.companyId),
}));
//# sourceMappingURL=channel_pairings.js.map