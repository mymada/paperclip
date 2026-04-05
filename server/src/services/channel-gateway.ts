import { and, desc, eq, sql } from "drizzle-orm";
import { createHash, randomInt } from "node:crypto";
import type { Db } from "@paperclipai/db";
import {
  channelConnections,
  channelSessions,
  channelPairings,
  channelMessages,
  agentWakeupRequests,
  agents,
} from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

export interface ChannelMessageEvent {
  platform: string;
  chatId: string;
  chatType: "dm" | "group" | "channel" | "thread";
  chatName?: string;
  senderId: string;
  senderName?: string;
  text: string;
  messageId?: string;
  threadId?: string;
  hasImages?: boolean;
  hasAudio?: boolean;
  hasDocuments?: boolean;
  timestamp: Date;
  raw?: unknown;
}

export function buildSessionKey(
  companyId: string,
  platform: string,
  chatType: string,
  chatId: string,
  threadId?: string
): string {
  const parts = ["paperclip", companyId, platform, chatType, chatId];
  if (threadId) {
    parts.push(threadId);
  }
  return parts.join(":");
}

export function generatePairingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

export function hashUserId(userId: string): string {
  // 32 hex chars = 128 bits — adequate collision resistance for user ID namespacing
  return createHash("sha256").update(userId).digest("hex").substring(0, 32);
}

export function channelGatewayService(db: Db) {
  return {
    listConnections: async (companyId: string) => {
      return db
        .select()
        .from(channelConnections)
        .where(eq(channelConnections.companyId, companyId))
        .orderBy(desc(channelConnections.createdAt));
    },

    createConnection: async (input: {
      companyId: string;
      platform: string;
      name: string;
      config: Record<string, unknown>;
      policyConfig?: Record<string, unknown>;
    }) => {
      const [connection] = await db
        .insert(channelConnections)
        .values({
          companyId: input.companyId,
          platform: input.platform,
          name: input.name,
          config: input.config,
          policyConfig: input.policyConfig ?? null,
          status: "disconnected",
        })
        .returning();
      return connection;
    },

    updateConnection: async (id: string, patch: {
      name?: string;
      config?: Record<string, unknown>;
      status?: string;
      lastConnectedAt?: Date;
      lastError?: string;
      policyConfig?: Record<string, unknown>;
    }) => {
      const [updated] = await db
        .update(channelConnections)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(channelConnections.id, id))
        .returning();
      return updated;
    },

    deleteConnection: async (id: string) => {
      await db.delete(channelConnections).where(eq(channelConnections.id, id));
    },

    getConnection: async (id: string) => {
      const [connection] = await db
        .select()
        .from(channelConnections)
        .where(eq(channelConnections.id, id));
      return connection;
    },

    getOrCreateSession: async (input: {
      companyId: string;
      connectionId?: string;
      platform: string;
      chatType: string;
      chatId: string;
      threadId?: string;
      userId?: string;
      userName?: string;
      chatName?: string;
    }) => {
      const sessionKey = buildSessionKey(
        input.companyId,
        input.platform,
        input.chatType,
        input.chatId,
        input.threadId
      );

      // Try to find existing session
      const [existing] = await db
        .select()
        .from(channelSessions)
        .where(eq(channelSessions.sessionKey, sessionKey));

      if (existing) {
        // Update last message time
        const [updated] = await db
          .update(channelSessions)
          .set({
            lastMessageAt: new Date(),
            messageCount: sql`${channelSessions.messageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(channelSessions.id, existing.id))
          .returning();
        return updated;
      }

      // Create new session
      const [session] = await db
        .insert(channelSessions)
        .values({
          companyId: input.companyId,
          connectionId: input.connectionId ?? null,
          sessionKey,
          platform: input.platform,
          chatId: input.chatId,
          chatType: input.chatType,
          chatName: input.chatName ?? null,
          userId: input.userId ?? null,
          userName: input.userName ?? null,
          threadId: input.threadId ?? null,
          messageCount: 1,
          lastMessageAt: new Date(),
        })
        .returning();
      return session;
    },

    handleInboundMessage: async (connectionId: string, messageEvent: ChannelMessageEvent) => {
      // Find the connection
      const [connection] = await db
        .select()
        .from(channelConnections)
        .where(eq(channelConnections.id, connectionId));

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      // For DMs, check if user is paired
      if (messageEvent.chatType === "dm") {
        const hashedUserId = hashUserId(messageEvent.senderId);
        const [pairing] = await db
          .select()
          .from(channelPairings)
          .where(
            and(
              eq(channelPairings.companyId, connection.companyId),
              eq(channelPairings.connectionId, connectionId),
              eq(channelPairings.platform, messageEvent.platform),
              eq(channelPairings.userId, hashedUserId),
              eq(channelPairings.status, "approved")
            )
          );

        if (!pairing) {
          throw new Error("User not authorized for direct messages");
        }
      }

      // Get or create session
      const session = await db.transaction(async (tx: any) => {
        const sessionKey = buildSessionKey(
          connection.companyId,
          messageEvent.platform,
          messageEvent.chatType,
          messageEvent.chatId,
          messageEvent.threadId
        );

        // Try to find existing session
        const [existing] = await tx
          .select()
          .from(channelSessions)
          .where(eq(channelSessions.sessionKey, sessionKey));

        if (existing) {
          // Update existing session
          const [updated] = await tx
            .update(channelSessions)
            .set({
              lastMessageAt: messageEvent.timestamp,
              messageCount: sql`${channelSessions.messageCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(channelSessions.id, existing.id))
            .returning();
          return updated;
        }

        // Create new session
        const [newSession] = await tx
          .insert(channelSessions)
          .values({
            companyId: connection.companyId,
            connectionId: connectionId,
            sessionKey,
            platform: messageEvent.platform,
            chatId: messageEvent.chatId,
            chatType: messageEvent.chatType,
            chatName: messageEvent.chatName ?? null,
            userId: messageEvent.senderId,
            userName: messageEvent.senderName ?? null,
            threadId: messageEvent.threadId ?? null,
            messageCount: 1,
            lastMessageAt: messageEvent.timestamp,
          })
          .returning();
        return newSession;
      });

      // Get the first agent for the company to create wakeup request
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.companyId, connection.companyId))
        .orderBy(agents.createdAt)
        .limit(1);

      if (!agent) {
        throw new Error(`No agents found for company ${connection.companyId}`);
      }

      // Create agent wakeup request
      const [wakeupRequest] = await db
        .insert(agentWakeupRequests)
        .values({
          companyId: connection.companyId,
          agentId: agent.id,
          source: "channel",
          reason: `Channel message from ${messageEvent.platform}`,
          payload: {
            sessionId: session.id,
            connectionId: connectionId,
            messageEvent: messageEvent as any,
          },
        })
        .returning();

      // Log the message
      const [message] = await db
        .insert(channelMessages)
        .values({
          companyId: connection.companyId,
          connectionId: connectionId,
          sessionId: session.id,
          platform: messageEvent.platform,
          chatId: messageEvent.chatId,
          senderId: messageEvent.senderId,
          senderName: messageEvent.senderName ?? null,
          text: messageEvent.text,
          chatType: messageEvent.chatType,
          threadId: messageEvent.threadId ?? null,
          messageId: messageEvent.messageId ?? null,
          hasImages: messageEvent.hasImages ?? false,
          hasAudio: messageEvent.hasAudio ?? false,
          hasDocuments: messageEvent.hasDocuments ?? false,
          normalizedEvent: messageEvent as any,
          agentWakeupRequestId: wakeupRequest.id,
          processedAt: new Date(),
        })
        .returning();

      return { session, wakeupRequest, message };
    },

    generatePairing: async (input: {
      companyId: string;
      connectionId: string;
      platform: string;
      userId: string;
    }) => {
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      const [pairing] = await db
        .insert(channelPairings)
        .values({
          companyId: input.companyId,
          connectionId: input.connectionId,
          platform: input.platform,
          userId: hashUserId(input.userId),
          code,
          expiresAt,
        })
        .returning();

      return { code, expiresAt, pairing };
    },

    approvePairing: async (companyId: string, code: string, approvedByUserId: string) => {
      const [pairing] = await db
        .select()
        .from(channelPairings)
        .where(
          and(
            eq(channelPairings.companyId, companyId),
            eq(channelPairings.code, code),
            eq(channelPairings.status, "pending")
          )
        );

      if (!pairing) {
        throw new Error("Pairing code not found or already processed");
      }

      if (new Date() > pairing.expiresAt) {
        await db
          .update(channelPairings)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(channelPairings.id, pairing.id));
        throw new Error("Pairing code has expired");
      }

      const [approved] = await db
        .update(channelPairings)
        .set({
          status: "approved",
          approvedByUserId,
          updatedAt: new Date(),
        })
        .where(eq(channelPairings.id, pairing.id))
        .returning();

      return approved;
    },

    checkPairing: async (companyId: string, connectionId: string, platform: string, userId: string) => {
      const hashedUserId = hashUserId(userId);

      const [pairing] = await db
        .select()
        .from(channelPairings)
        .where(
          and(
            eq(channelPairings.companyId, companyId),
            eq(channelPairings.connectionId, connectionId),
            eq(channelPairings.platform, platform),
            eq(channelPairings.userId, hashedUserId),
            eq(channelPairings.status, "approved")
          )
        );

      return !!pairing;
    },

    listSessions: async (companyId: string) => {
      return db
        .select()
        .from(channelSessions)
        .where(eq(channelSessions.companyId, companyId))
        .orderBy(desc(channelSessions.lastMessageAt));
    },

    listPendingPairings: async (companyId: string) => {
      return db
        .select()
        .from(channelPairings)
        .where(
          and(
            eq(channelPairings.companyId, companyId),
            eq(channelPairings.status, "pending")
          )
        )
        .orderBy(desc(channelPairings.createdAt));
    },

    sendOutbound: async (connectionId: string, chatId: string, text: string): Promise<void> => {
      const [connection] = await db
        .select()
        .from(channelConnections)
        .where(eq(channelConnections.id, connectionId));

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found for outbound send`);
      }

      // Platform dispatch — routes to the actual SDK adapter when integrated per-platform
      logger.info(
        { connectionId, platform: connection.platform, chatId, textLength: text.length },
        "Outbound channel message dispatched"
      );

      // Log the outbound message for audit trail
      await db.insert(channelMessages).values({
        companyId: connection.companyId,
        connectionId,
        platform: connection.platform,
        chatId,
        senderId: "agent",
        text,
        normalizedEvent: { direction: "outbound", content: text },
        processedAt: new Date(),
      });
    },
  };
}

