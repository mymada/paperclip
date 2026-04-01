import { and, eq, gte, sql } from "drizzle-orm";
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
        [issuesStats],
        pendingApprovals,
        [monthSpendRow],
        budgetOverview,
      ] = await Promise.all([
        db.select().from(companies).where(eq(companies.id, companyId)).then((rows) => rows[0] ?? null),
        db.select({ status: agents.status, count: sql<number>`count(*)` })
          .from(agents)
          .where(eq(agents.companyId, companyId))
          .groupBy(agents.status),
        // ⚡ Bolt: Combines 4 separate queries on `issues` into a single query using
        // conditional aggregations, saving multiple database round trips.
        db.select({
          open: sql<number>`coalesce(sum(case when ${issues.status} not in ('done', 'cancelled') then 1 else 0 end), 0)::int`,
          inProgress: sql<number>`coalesce(sum(case when ${issues.status} = 'in_progress' then 1 else 0 end), 0)::int`,
          blocked: sql<number>`coalesce(sum(case when ${issues.status} = 'blocked' then 1 else 0 end), 0)::int`,
          done: sql<number>`coalesce(sum(case when ${issues.status} = 'done' then 1 else 0 end), 0)::int`,
          criticalCount: sql<number>`coalesce(sum(case when ${issues.priority} = 'critical' and ${issues.status} not in ('done', 'cancelled') then 1 else 0 end), 0)::int`,
          stalledCount: sql<number>`coalesce(sum(case when ${issues.status} = 'in_progress' and ${issues.updatedAt} < ${staleThreshold} then 1 else 0 end), 0)::int`,
          doneThisWeekCount: sql<number>`coalesce(sum(case when ${issues.status} = 'done' and ${issues.completedAt} >= ${weekStart} then 1 else 0 end), 0)::int`,
        })
          .from(issues)
          .where(eq(issues.companyId, companyId)),
        db.select({ count: sql<number>`count(*)` })
          .from(approvals)
          .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
          .then((rows) => Number(rows[0]?.count ?? 0)),
        db.select({ monthSpend: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int` })
          .from(costEvents)
          .where(and(eq(costEvents.companyId, companyId), gte(costEvents.occurredAt, monthStart))),
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
        open: issuesStats?.open ?? 0,
        inProgress: issuesStats?.inProgress ?? 0,
        blocked: issuesStats?.blocked ?? 0,
        done: issuesStats?.done ?? 0,
      };

      const criticalCount = issuesStats?.criticalCount ?? 0;
      const stalledCount = issuesStats?.stalledCount ?? 0;
      const doneThisWeekCount = issuesStats?.doneThisWeekCount ?? 0;

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
