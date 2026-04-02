import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { planModeService } from "../services/index.js";
import { logger } from "../middleware/logger.js";
import { HttpError } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

const createPlanSchema = z.object({
  issueId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  heartbeatRunId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  objective: z.string().min(1).max(2000),
  steps: z.array(z.object({
    id: z.string(),
    order: z.number(),
    description: z.string(),
    estimatedCost: z.number().optional(),
    assigneeRoleHint: z.string().optional(),
  })),
  estimatedCostUsd: z.number().optional(),
  risks: z.array(z.object({
    severity: z.enum(["low", "medium", "high"]),
    description: z.string(),
  })).optional(),
  successCriteria: z.array(z.string()).optional(),
  subDelegations: z.array(z.object({
    goal: z.string(),
    assigneeRoleHint: z.string(),
    budgetCap: z.number(),
  })).optional(),
});

const reviewPlanSchema = z.object({
  reviewNote: z.string().optional(),
});

const rejectPlanSchema = z.object({
  reviewNote: z.string().min(1),
});

export function planRoutes(db: Db) {
  const router = Router();
  const svc = planModeService(db);

  // GET /companies/:companyId/plans - list plans
  router.get("/companies/:companyId/plans", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const issueId = typeof req.query.issueId === "string" ? req.query.issueId : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;

      const plans = await svc.listPlans(companyId, { issueId, status });
      res.json(plans);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId }, "Failed to list plans");
      throw error;
    }
  });

  // GET /companies/:companyId/plans/:planId - get plan
  router.get("/companies/:companyId/plans/:planId", async (req: Request, res: Response) => {
    try {
      const companyId = req.params.companyId as string;
      const planId = req.params.planId as string;
      assertCompanyAccess(req, companyId);

      const plan = await svc.getPlan(planId);
      if (!plan || plan.companyId !== companyId) {
        throw new HttpError(404, "Plan not found");
      }

      res.json(plan);
    } catch (error) {
      logger.error({ error, companyId: req.params.companyId, planId: req.params.planId }, "Failed to get plan");
      throw error;
    }
  });

  // POST /companies/:companyId/plans - create plan
  router.post(
    "/companies/:companyId/plans",
    validate(createPlanSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const plan = await svc.createPlan({ companyId, ...req.body });

        logger.info({ companyId, planId: plan.id, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Plan created");
        res.status(201).json(plan);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId }, "Failed to create plan");
        throw error;
      }
    }
  );

  // POST /companies/:companyId/plans/:planId/approve - approve plan
  router.post(
    "/companies/:companyId/plans/:planId/approve",
    validate(reviewPlanSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const planId = req.params.planId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const existingPlan = await svc.getPlan(planId);
        if (!existingPlan || existingPlan.companyId !== companyId) {
          throw new HttpError(404, "Plan not found");
        }

        const plan = await svc.approvePlan(planId, actorInfo.actorId, req.body.reviewNote);

        logger.info({ companyId, planId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Plan approved");
        res.json(plan);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, planId: req.params.planId }, "Failed to approve plan");
        throw error;
      }
    }
  );

  // POST /companies/:companyId/plans/:planId/reject - reject plan
  router.post(
    "/companies/:companyId/plans/:planId/reject",
    validate(rejectPlanSchema),
    async (req: Request, res: Response) => {
      try {
        const companyId = req.params.companyId as string;
        const planId = req.params.planId as string;
        assertCompanyAccess(req, companyId);
        const actorInfo = getActorInfo(req);

        const existingPlan = await svc.getPlan(planId);
        if (!existingPlan || existingPlan.companyId !== companyId) {
          throw new HttpError(404, "Plan not found");
        }

        const plan = await svc.rejectPlan(planId, actorInfo.actorId, req.body.reviewNote);

        logger.info({ companyId, planId, actorId: actorInfo.actorId, actorType: actorInfo.actorType }, "Plan rejected");
        res.json(plan);
      } catch (error) {
        logger.error({ error, companyId: req.params.companyId, planId: req.params.planId }, "Failed to reject plan");
        throw error;
      }
    }
  );

  return router;
}
