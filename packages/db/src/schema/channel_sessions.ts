import { pgTable, uuid, text, timestamp, jsonb, integer, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { channelConnections } from "./channel_connections.js";

export const channelSessions = pgTable(
  "channel_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    connectionId: uuid("connection_id").references(() => channelConnections.id),
    sessionKey: text("session_key").notNull(),
    platform: text("platform").notNull(),
    chatId: text("chat_id").notNull(),
    chatType: text("chat_type").notNull(),
    chatName: text("chat_name"),
    userId: text("user_id"),
    userName: text("user_name"),
    threadId: text("thread_id"),
    contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>(),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    messageCount: integer("message_count").default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    autoResetAt: timestamp("auto_reset_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("channel_sessions_company_idx").on(table.companyId),
    sessionKeyIdx: unique("channel_sessions_session_key_unq").on(table.sessionKey),
    companyPlatformChatIdx: index("channel_sessions_company_platform_chat_idx").on(table.companyId, table.platform, table.chatId),
  }),
);