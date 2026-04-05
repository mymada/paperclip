import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { delegationTasks, agentWakeupRequests } from "@paperclipai/db";
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
      // Create effective input that may be modified for depth/maxDepth
      let effectiveInput = { ...input };

      // Enforce max depth and budget constraints from parent (single fetch to avoid TOCTOU)
      if (input.parentTaskId) {
        const [parentTask] = await db.select().from(delegationTasks).where(eq(delegationTasks.id, input.parentTaskId));
        if (parentTask) {
          const effectiveMaxDepth = input.maxDepth ?? parentTask.maxDepth ?? 3;
          const childDepth = (parentTask.depth ?? 0) + 1;
          if (childDepth > effectiveMaxDepth) {
            throw new Error(`Delegation depth limit exceeded: depth ${childDepth} > maxDepth ${effectiveMaxDepth}`);
          }
          effectiveInput = { ...effectiveInput, depth: childDepth, maxDepth: effectiveMaxDepth };

          // Budget check against the same snapshot — no second fetch
          if (input.budgetCap && parentTask.budgetCap) {
            const parentBudget = parseFloat(parentTask.budgetCap);
            const parentSpent = parseFloat(parentTask.budgetSpent ?? "0");
            const parentRemaining = parentBudget - parentSpent;
            if (input.budgetCap > parentRemaining) {
              throw new Error(`Child budget cap ${input.budgetCap} exceeds parent remaining budget ${parentRemaining.toFixed(4)}`);
            }
          }
        }
      }

      const [task] = await db
        .insert(delegationTasks)
        .values({
          companyId: effectiveInput.companyId,
          rootTaskId: effectiveInput.rootTaskId ?? null,
          parentTaskId: effectiveInput.parentTaskId ?? null,
          delegatedByAgentId: effectiveInput.delegatedByAgentId ?? null,
          assignedAgentId: effectiveInput.assignedAgentId ?? null,
          goal: effectiveInput.goal,
          contextPacket: effectiveInput.contextPacket,
          expectedOutputSchema: effectiveInput.expectedOutputSchema ?? null,
          allowedTools: effectiveInput.allowedTools ?? null,
          budgetCap: effectiveInput.budgetCap?.toString() ?? null,
          depth: effectiveInput.depth ?? 0,
          maxDepth: effectiveInput.maxDepth ?? 3,
          priority: effectiveInput.priority ?? "medium",
        })
        .returning();

      // Wake up assigned agent if specified
      if (effectiveInput.assignedAgentId && task) {
        await db.insert(agentWakeupRequests).values({
          companyId: task.companyId,
          agentId: effectiveInput.assignedAgentId,
          source: "delegation_assigned",
          triggerDetail: `delegation:${task.id}`,
          reason: `Delegated task assigned: ${effectiveInput.goal.substring(0, 100)}`,
          payload: {
            type: "delegation_assigned",
            delegationTaskId: task.id,
            goal: effectiveInput.goal,
            contextPacket: effectiveInput.contextPacket,
            allowedTools: effectiveInput.allowedTools ?? [],
            budgetCap: effectiveInput.budgetCap ?? null,
            depth: task.depth,
            maxDepth: task.maxDepth,
          },
          status: "queued",
          requestedByActorType: "system",
          requestedByActorId: "delegation_engine",
        }).onConflictDoNothing();
      }

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

        // Wake the parent agent if this is a child delegation
        if (updated.delegatedByAgentId) {
          await db.insert(agentWakeupRequests).values({
            companyId: updated.companyId,
            agentId: updated.delegatedByAgentId,
            source: "delegation_completed",
            triggerDetail: `delegation:${id}`,
            reason: `Child delegation completed: ${updated.goal.substring(0, 100)}`,
            payload: {
              type: "delegation_completed",
              delegationTaskId: id,
              resultSummary: resultSummary,
            },
            status: "queued",
            requestedByActorType: "system",
            requestedByActorId: "delegation_engine",
          }).onConflictDoNothing();
        }
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

        // Wake the parent agent if this is a child delegation
        if (updated.delegatedByAgentId) {
          await db.insert(agentWakeupRequests).values({
            companyId: updated.companyId,
            agentId: updated.delegatedByAgentId,
            source: "delegation_failed",
            triggerDetail: `delegation:${id}`,
            reason: `Child delegation failed: ${updated.goal.substring(0, 100)}`,
            payload: {
              type: "delegation_failed",
              delegationTaskId: id,
              failureReason: reason,
            },
            status: "queued",
            requestedByActorType: "system",
            requestedByActorId: "delegation_engine",
          }).onConflictDoNothing();
        }
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
      // Get the root task
      const [rootTask] = await db.select().from(delegationTasks).where(eq(delegationTasks.id, rootTaskId));
      // Get all children
      const children = await db
        .select()
        .from(delegationTasks)
        .where(eq(delegationTasks.rootTaskId, rootTaskId))
        .orderBy(delegationTasks.depth, delegationTasks.createdAt);
      return rootTask ? [rootTask, ...children] : children;
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

      return limit ? query.limit(limit) : query;
    },
  };
}