import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { channelConnections } from "./channel_connections.js";
import { channelSessions } from "./channel_sessions.js";
import { agentWakeupRequests } from "./agent_wakeup_requests.js";

export const channelMessages = pgTable(
  "channel_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    connectionId: uuid("connection_id").notNull().references(() => channelConnections.id),
    sessionId: uuid("session_id").references(() => channelSessions.id),
    platform: text("platform").notNull(),
    chatId: text("chat_id").notNull(),
    senderId: text("sender_id").notNull(),
    senderName: text("sender_name"),
    text: text("text"),
    chatType: text("chat_type"),
    threadId: text("thread_id"),
    messageId: text("message_id"),
    hasImages: boolean("has_images").default(false),
    hasAudio: boolean("has_audio").default(false),
    hasDocuments: boolean("has_documents").default(false),
    normalizedEvent: jsonb("normalized_event").$type<Record<string, unknown>>(),
    agentWakeupRequestId: uuid("agent_wakeup_request_id").references(() => agentWakeupRequests.id, { onDelete: "set null" }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyPlatformChatIdx: index("channel_messages_company_platform_chat_idx").on(table.companyId, table.platform, table.chatId),
    messageIdIdx: index("channel_messages_message_id_idx").on(table.messageId),
    companyIdx: index("channel_messages_company_idx").on(table.companyId),
  }),
);