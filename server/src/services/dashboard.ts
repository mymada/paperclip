import { and, eq, gte, lt, notInArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, approvals, companies, costEvents, issues } from "@paperclipai/db";
import { notFound } from "../errors.js";
import { budgetService } from "./budgets.js";

export function dashboardService(db: Db) {
  const budgets = budgetService(db);
  return {
    summary: async (companyId: string) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        companyRow,
        agentRows,
        taskRows,
        pendingApprovals,
        [monthSpendRow],
        criticalCount,
        stalledCount,
        doneThisWeekCount,
        budgetOverview,
      ] = await Promise.all([
        db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null),
        db.select({ status: agents.status, count: sql<number>`count(*)` })
          .from(agents)
          .where(eq(agents.companyId, companyId))
          .groupBy(agents.status),
        db.select({ status: issues.status, count: sql<number>`count(*)` })
          .from(issues)
          .where(eq(issues.companyId, companyId))
          .groupBy(issues.status),
        db.select({ count: sql<number>`count(*)` })
          .from(approvals)
          .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db.select({ monthSpend: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int` })
          .from(costEvents)
          .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, monthStart))),
        db.select({ count: sql<number>`count(*)` })
          .from(issues)
          .where(and(
            eq(issues.companyId, companyId),
            eq(issues.priority, "critical"),
            notInArray(issues.status, ["done", "cancelled"]),
          ))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db.select({ count: sql<number>`count(*)` })
          .from(issues)
          .where(and(
            eq(issues.companyId, companyId),
            eq(issues.status, "in_progress"),
            lt(issues.updatedAt, staleThreshold),
          ))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db.select({ count: sql<number>`count(*)` })
          .from(issues)
          .where(and(
            eq(issues.companyId, companyId),
            eq(issues.status, "done"),
            gte(issues.completedAt, weekStart),
          ))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        budgets.overview(companyId),
      ]);

      if (!companyRow) throw notFound("Company not found");

      const agentCounts: Record<string, number> = {
        active: 0,
        running: 0,
        paused: 0,
        error: 0,
      };
      for (const row of agentRows) {
        const count = Number(row.count);
        // "idle" agents are operational — count them as active
        const bucket = row.status === "idle" ? "active" : row.status;
        agentCounts[bucket] = (agentCounts[bucket] ?? 0) + count;
      }

      const taskCounts: Record<string, number> = {
        open: 0,
        inProgress: 0,
        blocked: 0,
        done: 0,
      };
      for (const row of taskRows) {
        const count = Number(row.count);
        if (row.status === "in_progress") taskCounts.inProgress += count;
        if (row.status === "blocked") taskCounts.blocked += count;
        if (row.status === "done") taskCounts.done += count;
        if (row.status !== "done" && row.status !== "cancelled") taskCounts.open += count;
      }

      const monthSpendCents = Number(monthSpendRow?.monthSpend ?? 0);
      const utilization =
        companyRow.budgetMonthlyCents > 0
          ? (monthSpendCents / companyRow.budgetMonthlyCents) * 100
          : 0;

      return {
        companyId,
        agents: {
          active: agentCounts.active,
          running: agentCounts.running,
          paused: agentCounts.paused,
          error: agentCounts.error,
        },
        tasks: taskCounts,
        issues: {
          criticalCount,
          stalledCount,
          doneThisWeekCount,
        },
        costs: {
          monthSpendCents,
          monthBudgetCents: companyRow.budgetMonthlyCents,
          monthUtilizationPercent: Number(utilization.toFixed(2)),
        },
        pendingApprovals,
        budgets: {
          activeIncidents: budgetOverview.activeIncidents.length,
          pendingApprovals: budgetOverview.pendingApprovalCount,
          pausedAgents: budgetOverview.pausedAgentCount,
          pausedProjects: budgetOverview.pausedProjectCount,
        },
      };
    },
  };
}
