import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { authApi } from "../api/auth";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { MetricCard } from "../components/MetricCard";
import { EmptyState } from "../components/EmptyState";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { ActivityRow } from "../components/ActivityRow";
import { Identity } from "../components/Identity";
import { timeAgo } from "../lib/timeAgo";
import { formatCents } from "../lib/utils";
import {
  Bot,
  CircleDot,
  DollarSign,
  ShieldCheck,
  LayoutDashboard,
  PauseCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { ChartCard, RunActivityChart, SuccessRateChart } from "../components/ActivityCharts";
import { PageSkeleton } from "../components/PageSkeleton";
import type { Agent, Issue } from "@paperclipai/shared";
import { PluginSlotOutlet } from "@/plugins/slots";

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h

function isStalled(issue: Issue): boolean {
  if (issue.status !== "in_progress") return false;
  const updated = new Date(issue.updatedAt).getTime();
  return Date.now() - updated > STALE_THRESHOLD_MS;
}

function doneThisWeek(issues: Issue[]): number {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return issues.filter(
    (i) => i.status === "done" && i.completedAt && new Date(i.completedAt).getTime() > since
  ).length;
}

/** Issues that demand attention: critical/high priority, not done/cancelled, sorted by urgency */
function priorityIssues(issues: Issue[]): Issue[] {
  return issues
    .filter(
      (i) =>
        !["done", "cancelled"].includes(i.status) &&
        ["critical", "high"].includes(i.priority)
    )
    .sort((a, b) => {
      // blocked first, then by priority, then stalled
      const aBlocked = a.status === "blocked" ? -1 : 0;
      const bBlocked = b.status === "blocked" ? -1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      const pd = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (pd !== 0) return pd;
      return isStalled(a) ? -1 : isStalled(b) ? 1 : 0;
    });
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [animatedActivityIds, setAnimatedActivityIds] = useState<Set<string>>(new Set());
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const hydratedActivityRef = useRef(false);
  const activityAnimationTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(selectedCompanyId!),
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: activity } = useQuery({
    queryKey: queryKeys.activity(selectedCompanyId!),
    queryFn: () => activityApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    staleTime: 5 * 60_000,
  });

  const currentUserId = session?.user?.id;

  // Live activity animation
  const recentActivity = useMemo(() => (activity ?? []).slice(0, 8), [activity]);

  useEffect(() => {
    for (const timer of activityAnimationTimersRef.current) window.clearTimeout(timer);
    activityAnimationTimersRef.current = [];
    seenActivityIdsRef.current = new Set();
    hydratedActivityRef.current = false;
    setAnimatedActivityIds(new Set());
  }, [selectedCompanyId]);

  useEffect(() => {
    if (recentActivity.length === 0) return;
    const seen = seenActivityIdsRef.current;
    const currentIds = recentActivity.map((e) => e.id);
    if (!hydratedActivityRef.current) {
      for (const id of currentIds) seen.add(id);
      hydratedActivityRef.current = true;
      return;
    }
    const newIds = currentIds.filter((id) => !seen.has(id));
    if (newIds.length === 0) { for (const id of currentIds) seen.add(id); return; }
    setAnimatedActivityIds((prev) => { const n = new Set(prev); for (const id of newIds) n.add(id); return n; });
    for (const id of newIds) seen.add(id);
    const timer = window.setTimeout(() => {
      setAnimatedActivityIds((prev) => { const n = new Set(prev); for (const id of newIds) n.delete(id); return n; });
      activityAnimationTimersRef.current = activityAnimationTimersRef.current.filter((t) => t !== timer);
    }, 980);
    activityAnimationTimersRef.current.push(timer);
  }, [recentActivity]);

  useEffect(() => () => { for (const t of activityAnimationTimersRef.current) window.clearTimeout(t); }, []);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.identifier ?? i.id.slice(0, 8));
    for (const a of agents ?? []) map.set(`agent:${a.id}`, a.name);
    for (const p of projects ?? []) map.set(`project:${p.id}`, p.name);
    return map;
  }, [issues, agents, projects]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.title);
    return map;
  }, [issues]);

  const agentName = (id: string | null) => (id ? agentMap.get(id)?.name ?? null : null);

  // Derived issue metrics — counts come from backend summary; arrays computed locally for panel rendering
  const stalledIssues = useMemo(() => (issues ?? []).filter(isStalled), [issues]);
  const topIssues = useMemo(() => priorityIssues(issues ?? []).slice(0, 8), [issues]);

  // Founder actions
  const founderActions = useMemo(() => {
    if (!issues || !currentUserId) return [];
    return issues
      .filter((i) => i.assigneeUserId === currentUserId && !["done", "cancelled"].includes(i.status))
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
      .slice(0, 5);
  }, [issues, currentUserId]);

  const allFounderActionsCount = useMemo(() => {
    if (!issues || !currentUserId) return 0;
    return issues.filter(
      (i) => i.assigneeUserId === currentUserId && !["done", "cancelled"].includes(i.status)
    ).length;
  }, [issues, currentUserId]);

  if (!selectedCompanyId) {
    if (companies.length === 0) {
      return (
        <EmptyState
          icon={LayoutDashboard}
          message="Welcome to Paperclip. Set up your first company and agent to get started."
          action="Get Started"
          onAction={openOnboarding}
        />
      );
    }
    return <EmptyState icon={LayoutDashboard} message="Create or select a company to view the dashboard." />;
  }

  if (isLoading) return <PageSkeleton variant="dashboard" />;

  const hasNoAgents = agents !== undefined && agents.length === 0;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {hasNoAgents && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">You have no agents.</p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId! })}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline underline-offset-2 shrink-0"
          >
            Create one here
          </button>
        </div>
      )}

      {/* Budget incidents */}
      {data && data.budgets.activeIncidents > 0 && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(255,80,80,0.12),rgba(255,255,255,0.02))] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <p className="text-sm font-medium text-red-50">
                {data.budgets.activeIncidents} active budget incident{data.budgets.activeIncidents === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-red-100/70">
                {data.budgets.pausedAgents} agents paused · {data.budgets.pausedProjects} projects paused
              </p>
            </div>
          </div>
          <Link to="/costs" className="text-sm underline underline-offset-2 text-red-100">Open budgets</Link>
        </div>
      )}

      {/* Founder Actions Required */}
      {founderActions.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Actions Requises — Fondateur
              </h3>
            </div>
            <Link to="/my-issues" className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2">
              Voir tout ({allFounderActionsCount}) →
            </Link>
          </div>
          <div className="divide-y divide-red-500/10">
            {founderActions.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.identifier ?? issue.id}`}
                className="flex items-center gap-3 py-2 hover:opacity-80 transition-opacity no-underline text-inherit"
              >
                <StatusIcon status={issue.status} />
                <PriorityIcon priority={issue.priority} />
                <span className="flex-1 min-w-0 truncate text-sm">{issue.title}</span>
                {issue.priority === "critical" && (
                  <span className="text-xs font-medium text-red-500 shrink-0">CRITIQUE</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <ActiveAgentsPanel companyId={selectedCompanyId!} />

      {/* Metric Cards — actionable signals only */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-1 sm:gap-2">
        <MetricCard
          icon={AlertTriangle}
          value={data?.issues.criticalCount ?? 0}
          label="Issues Critiques"
          to="/issues"
          description={
            <span>
              {data?.tasks.blocked ?? 0} bloquées{(data?.issues.stalledCount ?? 0) > 0 ? `, ${data!.issues.stalledCount} en retard` : ""}
            </span>
          }
        />
        <MetricCard
          icon={CheckCircle2}
          value={data?.issues.doneThisWeekCount ?? 0}
          label="Terminées cette semaine"
          to="/issues"
          description={<span>{data?.tasks.inProgress ?? 0} en cours</span>}
        />
        <MetricCard
          icon={DollarSign}
          value={data ? formatCents(data.costs.monthSpendCents) : "—"}
          label="Dépenses du mois"
          to="/costs"
          description={
            <span>
              {data && data.costs.monthBudgetCents > 0
                ? `${data.costs.monthUtilizationPercent}% du budget ${formatCents(data.costs.monthBudgetCents)}`
                : "Budget illimité"}
            </span>
          }
        />
        <MetricCard
          icon={ShieldCheck}
          value={data ? data.pendingApprovals + data.budgets.pendingApprovals : 0}
          label="Approbations en attente"
          to="/approvals"
          description={<span>Nécessitent ta validation</span>}
        />
      </div>

      {/* Stalled issues warning */}
      {stalledIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-950/10 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">
              {stalledIssues.length} issue{stalledIssues.length > 1 ? "s" : ""} en retard (+48h sans activité)
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5 truncate">
              {stalledIssues.slice(0, 3).map((i) => i.title).join(" · ")}
              {stalledIssues.length > 3 ? ` · +${stalledIssues.length - 3} autres` : ""}
            </p>
          </div>
          <Link to="/issues" className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0">
            Voir →
          </Link>
        </div>
      )}

      {/* Charts — only the 2 most useful ones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Activité des runs" subtitle="14 derniers jours">
          <RunActivityChart runs={runs ?? []} />
        </ChartCard>
        <ChartCard title="Taux de succès" subtitle="14 derniers jours">
          <SuccessRateChart runs={runs ?? []} />
        </ChartCard>
      </div>

      <PluginSlotOutlet
        slotTypes={["dashboardWidget"]}
        context={{ companyId: selectedCompanyId }}
        className="grid gap-4 md:grid-cols-2"
        itemClassName="rounded-lg border bg-card p-4 shadow-sm"
      />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Priority Issues — what actually needs attention */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Issues Prioritaires
            </h3>
            <Link to="/issues" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Toutes →
            </Link>
          </div>
          {topIssues.length === 0 ? (
            <div className="border border-border p-4 rounded">
              <p className="text-sm text-muted-foreground">Aucune issue critique ou haute priorité active.</p>
            </div>
          ) : (
            <div className="border border-border divide-y divide-border overflow-hidden rounded">
              {topIssues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.identifier ?? issue.id}`}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50 transition-colors no-underline text-inherit"
                >
                  <StatusIcon status={issue.status} />
                  <PriorityIcon priority={issue.priority} />
                  <span className="flex-1 min-w-0 truncate text-sm">{issue.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isStalled(issue) && (
                      <span title="En retard +48h">
                        <Clock className="h-3 w-3 text-amber-400" />
                      </span>
                    )}
                    {issue.status === "blocked" && (
                      <span title="Bloquée">
                        <Ban className="h-3 w-3 text-red-400" />
                      </span>
                    )}
                    {issue.assigneeAgentId && (() => {
                      const name = agentName(issue.assigneeAgentId);
                      return name ? <Identity name={name} size="sm" /> : null;
                    })()}
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {timeAgo(issue.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity — filtered, meaningful */}
        {recentActivity.length > 0 && (
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Activité Récente
              </h3>
              <Link to="/activity" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Tout →
              </Link>
            </div>
            <div className="border border-border divide-y divide-border overflow-hidden rounded">
              {recentActivity.map((event) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  agentMap={agentMap}
                  entityNameMap={entityNameMap}
                  entityTitleMap={entityTitleMap}
                  className={animatedActivityIds.has(event.id) ? "activity-row-enter" : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
