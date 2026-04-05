import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { notificationDispatcherService } from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { HttpError } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const createNotificationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.enum([
    "heartbeat.completed",
    "heartbeat.failed",
    "issue.completed",
    "issue.stuck",
    "budget.exceeded",
    "delegation.escalated",
    "plan.approved",
    "plan.rejected",
  ]),
  conditions: z.object({
    agentId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    minCostUsd: z.number().optional(),
  }).optional(),
  channelConnectionId: z.string().uuid().optional(),
  deliveryTarget: z.enum(["channel", "email", "log"]),
  targetConfig: z.object({
    email: z.string().email().optional(),
    chatId: z.string().optional(),
    agentId: z.string().uuid().optional(),
  }).optional(),
  messageTemplate: z.string().min(1).max(2000),
  enabled: z.boolean().optional(),
});

const updateNotificationRuleSchema = createNotificationRuleSchema.partial();

export function notificationRuleRoutes(db: Db) {
  const router = Router();
  const svc = notificationDispatcherService(db);

  // GET /companies/:companyId/notification-rules - list rules
  router.get("/companies/:companyId/notification-rules", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const rules = await svc.listRules(companyId);
      res.json(rules);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId }, "Failed to list notification rules");
      throw error;
    }
  });

  // POST /companies/:companyId/notification-rules - create rule
  router.post(
    "/companies/:companyId/notification-rules",
    validate(createNotificationRuleSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const rule = await svc.createRule(companyId, req.body);

        logger.info({ companyId, ruleId: rule.id, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Notification rule created");
        res.status(201).json(rule);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId }, "Failed to create notification rule");
        throw error;
      }
    }
  );

  // PATCH /companies/:companyId/notification-rules/:ruleId - update rule
  router.patch(
    "/companies/:companyId/notification-rules/:ruleId",
    validate(updateNotificationRuleSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const ruleId = req.params.ruleId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const existingRules = await svc.listRules(companyId);
        if (!existingRules.find((r: { id: string }) => r.id === ruleId)) {
          throw new HttpError(404, "Notification rule not found");
        }

        const rule = await svc.updateRule(ruleId, req.body);

        logger.info({ companyId, ruleId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Notification rule updated");
        res.json(rule);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, ruleId: req.params.ruleId }, "Failed to update notification rule");
        throw error;
      }
    }
  );

  // DELETE /companies/:companyId/notification-rules/:ruleId - delete rule
  router.delete("/companies/:companyId/notification-rules/:ruleId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const ruleId = req.params.ruleId as string;
      assertCompanyAccess(req, companyId);
      const actorInfo = getActorInfo(req);

      const existingRules = await svc.listRules(companyId);
      if (!existingRules.find((r: { id: string }) => r.id === ruleId)) {
        throw new HttpError(404, "Notification rule not found");
      }

      await svc.deleteRule(ruleId);
      logger.info({ companyId, ruleId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Notification rule deleted");
      res.status(204).send();
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, ruleId: req.params.ruleId }, "Failed to delete notification rule");
      throw error;
    }
  });

  // GET /companies/:companyId/notification-deliveries - list recent deliveries
  router.get("/companies/:companyId/notification-deliveries", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const deliveries = await svc.listDeliveries(companyId);
      res.json(deliveries);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId }, "Failed to list notification deliveries");
      throw error;
    }
  });

  return router;
}
