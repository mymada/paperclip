import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { delegationService } from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { HttpError } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const createDelegationSchema = z.object({
  rootTaskId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  delegatedByAgentId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  goal: z.string().min(1).max(1000),
  contextPacket: z.object({
    businessContext: z.string(),
    constraints: z.array(z.string()),
    references: z.array(z.string()),
    dataNeeded: z.array(z.string()),
    outputFormat: z.string(),
  }),
  expectedOutputSchema: z.object({
    summary: z.string(),
    findings: z.array(z.string()),
    decisions: z.array(z.string()),
    artifacts: z.array(z.string()),
    nextSteps: z.array(z.string()),
  }).optional(),
  allowedTools: z.array(z.string()).optional(),
  budgetCap: z.number().optional(),
  depth: z.number().optional(),
  maxDepth: z.number().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

const completeTaskSchema = z.object({
  resultSummary: z.object({
    summary: z.string(),
    findings: z.array(z.string()),
    decisions: z.array(z.string()),
    risks: z.array(z.string()),
    nextSteps: z.array(z.string()),
    requiresEscalation: z.boolean(),
    artifacts: z.array(z.string()),
  }),
});

const failTaskSchema = z.object({
  reason: z.string().min(1),
});

export function delegationRoutes(db: Db) {
  const router = Router();
  const svc = delegationService(db);

  // GET /companies/:companyId/delegations - list delegations
  router.get("/companies/:companyId/delegations", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const assignedAgentId = typeof req.query.assignedAgentId === "string" ? req.query.assignedAgentId : undefined;

      const delegations = await svc.listDelegations(companyId, { status, assignedAgentId });
      res.json(delegations);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId }, "Failed to list delegations");
      throw error;
    }
  });

  // GET /companies/:companyId/delegations/:taskId - get delegation task
  router.get("/companies/:companyId/delegations/:taskId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const taskId = req.params.taskId as string;
      assertCompanyAccess(req, companyId);

      const task = await svc.getDelegation(taskId);
      if (!task || task.companyId !== companyId) {
        throw new HttpError(404, "Delegation task not found");
      }

      res.json(task);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, taskId: req.params.taskId }, "Failed to get delegation task");
      throw error;
    }
  });

  // POST /companies/:companyId/delegations - create delegation
  router.post(
    "/companies/:companyId/delegations",
    validate(createDelegationSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const task = await svc.createDelegation({
          companyId,
          ...req.body,
        });

        logger.info({
          companyId,
          taskId: task.id,
          actorId: actorInfo.actorId,
          actorType: actorInfo.actorType,
        }, "Delegation task created");

        res.status(201).json(task);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId }, "Failed to create delegation");
        throw error;
      }
    }
  );

  // GET /companies/:companyId/delegations/:taskId/tree - get delegation tree
  router.get("/companies/:companyId/delegations/:taskId/tree", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const taskId = req.params.taskId as string;
      assertCompanyAccess(req, companyId);

      const task = await svc.getDelegation(taskId);
      if (!task || task.companyId !== companyId) {
        throw new HttpError(404, "Delegation task not found");
      }

      const rootTaskId = task.rootTaskId || taskId;
      const tree = await svc.getDelegationTree(rootTaskId);

      res.json(tree);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, taskId: req.params.taskId }, "Failed to get delegation tree");
      throw error;
    }
  });

  // POST /companies/:companyId/delegations/:taskId/complete - complete delegation
  router.post(
    "/companies/:companyId/delegations/:taskId/complete",
    validate(completeTaskSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const taskId = req.params.taskId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const existingTask = await svc.getDelegation(taskId);
        if (!existingTask || existingTask.companyId !== companyId) {
          throw new HttpError(404, "Delegation task not found");
        }

        const task = await svc.completeDelegation(taskId, req.body.resultSummary);

        logger.info({
          companyId,
          taskId,
          actorId: actorInfo.actorId,
          actorType: actorInfo.actorType,
        }, "Delegation task completed");

        res.json(task);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, taskId: req.params.taskId }, "Failed to complete delegation");
        throw error;
      }
    }
  );

  // POST /companies/:companyId/delegations/:taskId/fail - fail delegation
  router.post(
    "/companies/:companyId/delegations/:taskId/fail",
    validate(failTaskSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const taskId = req.params.taskId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const existingTask = await svc.getDelegation(taskId);
        if (!existingTask || existingTask.companyId !== companyId) {
          throw new HttpError(404, "Delegation task not found");
        }

        const task = await svc.failDelegation(taskId, req.body.reason);

        logger.info({
          companyId,
          taskId,
          reason: req.body.reason,
          actorId: actorInfo.actorId,
          actorType: actorInfo.actorType,
        }, "Delegation task failed");

        res.json(task);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, taskId: req.params.taskId }, "Failed to fail delegation");
        throw error;
      }
    }
  );

  // POST /companies/:companyId/delegations/:taskId/cancel - cancel delegation
  router.post("/companies/:companyId/delegations/:taskId/cancel", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const taskId = req.params.taskId as string;
      assertCompanyAccess(req, companyId);
      const actorInfo = getActorInfo(req);

      const existingTask = await svc.getDelegation(taskId);
      if (!existingTask || existingTask.companyId !== companyId) {
        throw new HttpError(404, "Delegation task not found");
      }

      const task = await svc.cancelDelegation(taskId);

      logger.info({
        companyId,
        taskId,
        actorId: actorInfo.actorId,
        actorType: actorInfo.actorType,
      }, "Delegation task cancelled");

      res.json(task);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, taskId: req.params.taskId }, "Failed to cancel delegation");
      throw error;
    }
  });

  return router;
}
