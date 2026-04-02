import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { delegationTasks } from "@paperclipai/db";
import { publishLiveEvent } from "./live-events.js";

export function delegationService(db: Db) {
  return {
    createDelegation: async (input: {
      companyId: string;
      rootTaskId?: string;
      parentTaskId?: string;
      delegatedByAgentId?: string;
      assignedAgentId?: string;
      goal: string;
      contextPacket: {
        businessContext: string;
        constraints: string[];
        references: string[];
        dataNeeded: string[];
        outputFormat: string;
      };
      expectedOutputSchema?: {
        summary: string;
        findings: string[];
        decisions: string[];
        artifacts: string[];
        nextSteps: string[];
      };
      allowedTools?: string[];
      budgetCap?: number;
      depth?: number;
      maxDepth?: number;
      priority?: "low" | "medium" | "high" | "urgent";
    }) => {
      const [task] = await db
        .insert(delegationTasks)
        .values({
          companyId: input.companyId,
          rootTaskId: input.rootTaskId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          delegatedByAgentId: input.delegatedByAgentId ?? null,
          assignedAgentId: input.assignedAgentId ?? null,
          goal: input.goal,
          contextPacket: input.contextPacket,
          expectedOutputSchema: input.expectedOutputSchema ?? null,
          allowedTools: input.allowedTools ?? null,
          budgetCap: input.budgetCap?.toString() ?? null,
          depth: input.depth ?? 0,
          maxDepth: input.maxDepth ?? 3,
          priority: input.priority ?? "medium",
        })
        .returning();
      return task;
    },

    claimDelegation: async (id: string, agentId: string) => {
      const [updated] = await db
        .update(delegationTasks)
        .set({
          status: "claimed",
          assignedAgentId: agentId,
          claimedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(delegationTasks.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "delegation.updated",
          payload: {
            taskId: id,
            status: "claimed",
          },
        });
      }

      return updated;
    },

    startDelegation: async (id: string) => {
      const [updated] = await db
        .update(delegationTasks)
        .set({
          status: "in_progress",
          updatedAt: new Date(),
        })
        .where(eq(delegationTasks.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "delegation.updated",
          payload: {
            taskId: id,
            status: "in_progress",
          },
        });
      }

      return updated;
    },

    completeDelegation: async (id: string, resultSummary: {
      summary: string;
      findings: string[];
      decisions: string[];
      risks: string[];
      nextSteps: string[];
      requiresEscalation: boolean;
      artifacts: string[];
    }) => {
      const [updated] = await db
        .update(delegationTasks)
        .set({
          status: "completed",
          resultSummary,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(delegationTasks.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "delegation.updated",
          payload: {
            taskId: id,
            status: "completed",
          },
        });
      }

      return updated;
    },

    failDelegation: async (id: string, reason: string) => {
      const [updated] = await db
        .update(delegationTasks)
        .set({
          status: "failed",
          resultSummary: {
            summary: `Task failed: ${reason}`,
            findings: [],
            decisions: [],
            risks: [reason],
            nextSteps: ["Investigate failure", "Consider retry or escalation"],
            requiresEscalation: true,
            artifacts: [],
          },
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(delegationTasks.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "delegation.updated",
          payload: {
            taskId: id,
            status: "failed",
          },
        });
      }

      return updated;
    },

    cancelDelegation: async (id: string) => {
      const [updated] = await db
        .update(delegationTasks)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(delegationTasks.id, id))
        .returning();

      if (updated) {
        publishLiveEvent({
          companyId: updated.companyId,
          type: "delegation.updated",
          payload: {
            taskId: id,
            status: "cancelled",
          },
        });
      }

      return updated;
    },

    getDelegation: async (id: string) => {
      const [task] = await db
        .select()
        .from(delegationTasks)
        .where(eq(delegationTasks.id, id));
      return task ?? null;
    },

    listDelegations: async (companyId: string, filters?: {
      status?: string;
      assignedAgentId?: string;
      rootTaskId?: string;
    }) => {
      const query = db
        .select()
        .from(delegationTasks)
        .where(
          and(
            eq(delegationTasks.companyId, companyId),
            filters?.status ? eq(delegationTasks.status, filters.status) : undefined,
            filters?.assignedAgentId ? eq(delegationTasks.assignedAgentId, filters.assignedAgentId) : undefined,
            filters?.rootTaskId ? eq(delegationTasks.rootTaskId, filters.rootTaskId) : undefined
          )
        )
        .orderBy(desc(delegationTasks.createdAt));
      return query;
    },

    getDelegationTree: async (rootTaskId: string) => {
      const tasks = await db
        .select()
        .from(delegationTasks)
        .where(eq(delegationTasks.rootTaskId, rootTaskId))
        .orderBy(delegationTasks.depth, delegationTasks.createdAt);
      return tasks;
    },

    getPendingForAgent: async (companyId: string, agentId: string, limit?: number) => {
      const query = db
        .select()
        .from(delegationTasks)
        .where(
          and(
            eq(delegationTasks.companyId, companyId),
            eq(delegationTasks.assignedAgentId, agentId),
            eq(delegationTasks.status, "pending")
          )
        )
        .orderBy(desc(delegationTasks.createdAt));

      if (limit) {
        query.limit(limit);
      }

      return query;
    },
  };
}