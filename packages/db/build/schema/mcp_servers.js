import { pgTable, uuid, text, timestamp, jsonb, } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
/**
 * [DATA_BUS] : Source: MCP Bridge, Business-Superpowers v16.1.
 * [LOGIC_REPORT] : Table to persist MCP server configurations for agents.
 */
export const mcpServers = pgTable("mcp_servers", {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    command: text("command").notNull(),
    args: text("args").array().notNull().default([]),
    env: jsonb("env").$type().notNull().default({}),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=mcp_servers.js.map