import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issuePlans } from "@paperclipai/db";
import { publishLiveEvent } from "./live-events.js";

export function planModeService(db: Db) {
  return {
    createPlan: async (input: {
      companyId: string;
      issueId?: string;
      agentId?: string;
      heartbeatRunId?: string;
      title: string;
      objective: string;
      steps: Array<{
        id: string;
        order: number;
        description: string;
        estimatedCost?: number;
        assigneeRoleHint?: string;
      }>;
      estimatedCostUsd?: number;
      risks?: Array<{
        severity: "low" | "medium" | "high";
        description: string;
      }>;
      successCriteria?: string[];
      subDelegations?: Array<{
        goal: string;
        assigneeRoleHint: string;
        budgetCap: number;
      }>;
    }) => {
      const [plan] = await db
        .insert(issuePlans)
        .values({
          companyId: input.companyId,
          issueId: input.issueId ?? null,
          agentId: input.agentId ?? null,
          heartbeatRunId: input.heartbeatRunId ?? null,
          title: input.title,
          objective: input.objective,
          steps: input.steps,
          estimatedCostUsd: input.estimatedCostUsd?.toString() ?? null,
          risks: input.risks ?? null,
          successCriteria: input.successCriteria ?? null,
          subDelegations: input.subDelegations ?? null,
        })
        .returning();
      return plan;
    },

    getPlan: async (id: string) => {
      const [plan] = await db
        .select()
        .from(issuePlans)
        .where(eq(issuePlans.id, id));
      return plan ?? null;
    },

    listPlans: async (companyId: string, filters?: {
      issueId?: string;
      status?: string;
    }) => {
      const query = db
        .select()
        .from(issuePlans)
        .where(
          and(
            eq(issuePlans.companyId, companyId),
            filters?.issueId ? eq(issuePlans.issueId, filters.issueId) : undefined,
            filters?.status ? eq(issuePlans.status, filters.status) : undefined
          )
        )
        .orderBy(desc(issuePlans.createdAt));
      return query;
    },

    approvePlan: async (id: string, reviewedByUserId: string, reviewNote?: string) => {
      const [updated] = await db
        .update(issuePlans)
        .set({
          status: "approved",
          reviewedByUserId,
          reviewNote: reviewNote ?? null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(issuePlans.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "plan.updated",
          payload: {
            planId: id,
            status: "approved",
          },
        });
      }

      return updated;
    },

    rejectPlan: async (id: string, reviewedByUserId: string, reviewNote: string) => {
      const [updated] = await db
        .update(issuePlans)
        .set({
          status: "rejected",
          reviewedByUserId,
          reviewNote,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(issuePlans.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "plan.updated",
          payload: {
            planId: id,
            status: "rejected",
          },
        });
      }

      return updated;
    },

    supersedePlan: async (id: string) => {
      const [updated] = await db
        .update(issuePlans)
        .set({
          status: "superseded",
          updatedAt: new Date(),
        })
        .where(eq(issuePlans.id, id))
        .returning();

      return updated;
    },

    getActivePlanForIssue: async (issueId: string) => {
      const [plan] = await db
        .select()
        .from(issuePlans)
        .where(
          and(
            eq(issuePlans.issueId, issueId),
            eq(issuePlans.status, "approved")
          )
        )
        .orderBy(desc(issuePlans.createdAt))
        .limit(1);

      return plan ?? null;
    },
  };
}