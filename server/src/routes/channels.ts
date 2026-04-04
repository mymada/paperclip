import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { channelGatewayService, type ChannelMessageEvent } from "../services/channel-gateway.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { notFound, forbidden } from "../errors.js";
import { logger } from "../middleware/logger.js";

const createConnectionSchema = z.object({
  platform: z.enum(["slack", "telegram", "discord", "email", "webhook", "whatsapp", "signal"]),
  name: z.string().min(1),
  config: z.record(z.unknown()),
  policyConfig: z.record(z.unknown()).optional(),
});

const updateConnectionSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  lastError: z.string().optional(),
  policyConfig: z.record(z.unknown()).optional(),
});

const inboundMessageSchema = z.object({
  platform: z.string(),
  chatId: z.string(),
  chatType: z.enum(["dm", "group", "channel", "thread"]),
  chatName: z.string().optional(),
  senderId: z.string(),
  senderName: z.string().optional(),
  text: z.string(),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  hasImages: z.boolean().optional(),
  hasAudio: z.boolean().optional(),
  hasDocuments: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
  raw: z.unknown().optional(),
});

const approvePairingSchema = z.object({
  code: z.string().length(8),
});

export function channelRoutes(db: Db) {
  const router = Router();
  const service = channelGatewayService(db);

  // List channel connections
  router.get("/companies/:companyId/channel-connections", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const connections = await service.listConnections(companyId);
      res.json(connections);
    } catch (error) {
      next(error);
    }
  });

  // Create channel connection
  router.post(
    "/companies/:companyId/channel-connections",
    validate(createConnectionSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);

        const connection = await service.createConnection({
          companyId,
          platform: req.body.platform as string,
          name: req.body.name as string,
          config: req.body.config as Record<string, unknown>,
          policyConfig: req.body.policyConfig as Record<string, unknown> | undefined,
        });

        res.status(201).json(connection);
      } catch (error) {
        next(error);
      }
    }
  );

  // Update channel connection
  router.patch(
    "/companies/:companyId/channel-connections/:connectionId",
    validate(updateConnectionSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const companyId = req.params.companyId as string;
        const connectionId = req.params.connectionId as string;
        assertCompanyAccess(req, companyId);

        const existing = await service.getConnection(connectionId);
        if (!existing) throw notFound("Connection not found");
        if (existing.companyId !== companyId) throw forbidden("Connection does not belong to this company");

        const updated = await service.updateConnection(connectionId, {
          name: req.body.name as string | undefined,
          config: req.body.config as Record<string, unknown> | undefined,
          status: req.body.status as string | undefined,
          lastError: req.body.lastError as string | undefined,
          policyConfig: req.body.policyConfig as Record<string, unknown> | undefined,
          lastConnectedAt: req.body.status === "connected" ? new Date() : undefined,
        });

        res.json(updated);
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete channel connection
  router.delete("/companies/:companyId/channel-connections/:connectionId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.params.companyId as string;
      const connectionId = req.params.connectionId as string;
      assertCompanyAccess(req, companyId);

      const existing = await service.getConnection(connectionId);
      if (!existing) throw notFound("Connection not found");
      if (existing.companyId !== companyId) throw forbidden("Connection does not belong to this company");

      await service.deleteConnection(connectionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // List active sessions
  router.get("/companies/:companyId/channel-sessions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const sessions = await service.listSessions(companyId);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  // Handle inbound message (webhook entry point — validated by channel secret, not session auth)
  router.post(
    "/companies/:companyId/channel-connections/:connectionId/inbound",
    validate(inboundMessageSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const companyId = req.params.companyId as string;
        const connectionId = req.params.connectionId as string;

        const connection = await service.getConnection(connectionId);
        if (!connection) throw notFound("Connection not found");
        if (connection.companyId !== companyId) throw forbidden("Connection does not belong to this company");

        // Validate channel secret
        const channelSecret = req.headers["x-paperclip-channel-secret"] as string | undefined;
        const expectedSecret = (connection.config as Record<string, unknown>)?.channelSecret as string | undefined;
        if (!expectedSecret) {
          logger.warn({ connectionId, companyId }, "Inbound webhook rejected because no channel secret is configured");
          throw forbidden("Channel secret is not configured");
        } else if (channelSecret !== expectedSecret) {
          throw forbidden("Invalid channel secret");
        }

        const messageEvent: ChannelMessageEvent = {
          platform: req.body.platform as string,
          chatId: req.body.chatId as string,
          chatType: req.body.chatType as "dm" | "group" | "channel" | "thread",
          chatName: req.body.chatName as string | undefined,
          senderId: req.body.senderId as string,
          senderName: req.body.senderName as string | undefined,
          text: req.body.text as string,
          messageId: req.body.messageId as string | undefined,
          threadId: req.body.threadId as string | undefined,
          hasImages: (req.body.hasImages as boolean | undefined) ?? false,
          hasAudio: (req.body.hasAudio as boolean | undefined) ?? false,
          hasDocuments: (req.body.hasDocuments as boolean | undefined) ?? false,
          timestamp: req.body.timestamp ? new Date(req.body.timestamp as string) : new Date(),
          raw: req.body.raw,
        };

        const result = await service.handleInboundMessage(connectionId, messageEvent);
        res.json({
          sessionId: result.session.id,
          wakeupRequestId: result.wakeupRequest?.id ?? null,
          messageId: result.message.id,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not authorized")) {
          const pairingResult = await service.generatePairing({
            companyId,
            connectionId,
            platform: req.body.platform as string,
            userId: req.body.senderId as string,
          });
          res.status(403).json({
            error: "User not authorized for direct messages",
            pairingCode: pairingResult.code,
            expiresAt: pairingResult.expiresAt,
          });
          return;
        }
        next(error);
      }
    }
  );

  // Approve pairing code
  router.post(
    "/companies/:companyId/channel-pairings/approve",
    validate(approvePairingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);

        const { actorId } = getActorInfo(req);

        const pairing = await service.approvePairing(companyId, req.body.code as string, actorId);
        res.json(pairing);
      } catch (error) {
        next(error);
      }
    }
  );

  // List pending pairings
  router.get("/companies/:companyId/channel-pairings", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const pairings = await service.listPendingPairings(companyId);
      res.json(pairings);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
