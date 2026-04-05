import { useEffect, useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { authApi } from "../api/auth";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import type { Agent, Issue } from "@paperclipai/shared";
import { GitBranch, Zap, CheckCircle2 } from "lucide-react";

interface TrackConfig {
  id: string;
  emoji: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  patterns: string[];
}

interface TrackStep {
  issue: Issue;
  agent?: Agent;
  isCurrentUser: boolean;
  requiresAction: boolean;
}

interface Track {
  config: TrackConfig;
  steps: TrackStep[];
}

const TRACKS: TrackConfig[] = [
  {
    id: "createCompany",
    emoji: "🚀",
    title: "Créer l'entreprise",
    priority: "critical",
    patterns: [
      "Négocier rupture conventionnelle",
      "Checklist actions AVANT fin",
      "Créer compte France Travail",
      "Décision ARCE|ARCE.*Maintien",
      "Choisir le statut juridique en France",
      "Préparer draft statuts SASU",
      "Validation Fondateur.*Statuts|Statuts MADAGRO GROUP SAS",
      "Immatriculer MADAGRO HOLDING",
      "Ouvrir compte bancaire professionnel.*HOLDING",
    ],
  },
  {
    id: "businessPlan",
    emoji: "📋",
    title: "Business Plan & Financement",
    priority: "high",
    patterns: [
      "Définir précisément l'objet du projet Madagascar",
      "Rédiger le Business Plan",
      "Identifier et sécuriser les financements",
      "Choisir la structure juridique côté Madagascar",
    ],
  },
  {
    id: "mioraProduction",
    emoji: "🖥️",
    title: "MIORA — Serveur Production",
    priority: "high",
    patterns: [
      "Déployer serveur production MIORA",
      "CI/CD pipeline production MIORA",
      "Rédiger contrat pilote coopérative",
      "Organiser journée démo terrain",
    ],
  },
  {
    id: "mobileMoney",
    emoji: "💳",
    title: "Mobile Money & SaaY",
    priority: "high",
    patterns: [
      "US-002.*Orange Money|Intégrer API Mobile Money",
      "US-003.*Dashboard Mon Abonnement",
      "US-004.*Relance paiement",
      "WhatsApp Onboarding.*Séquence|IMPL.*WhatsApp Onboarding",
    ],
  },
  {
    id: "governance",
    emoji: "🏢",
    title: "Gouvernance Fiscale",
    priority: "medium",
    patterns: [
      "TVA T1|prorogation TVA",
      "DGI Submission",
      "Gérer la fiscalité et comptabilité bi-nationale",
      "Convention de trésorerie Holding",
    ],
  },
];

function matchesPattern(title: string, pattern: string): boolean {
  // Handle pipe-separated alternatives (OR)
  const alternatives = pattern.split("|");
  return alternatives.some((alt) => {
    const regex = new RegExp(alt.trim(), "i");
    return regex.test(title);
  });
}

function buildTracks(issues: Issue[], agents: Agent[], currentUserId?: string): Track[] {
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return TRACKS.map((config) => {
    const steps: TrackStep[] = [];

    for (const pattern of config.patterns) {
      const issue = issues.find((i) => matchesPattern(i.title, pattern));
      if (issue) {
        const isCurrentUser = issue.assigneeUserId === currentUserId;
        const requiresAction = (issue.status === "in_review") || (issue.assigneeUserId && isCurrentUser) || false;

        steps.push({
          issue,
          agent: issue.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : undefined,
          isCurrentUser,
          requiresAction,
        });
      }
    }

    return { config, steps };
  });
}

function getStepColor(status: string): string {
  switch (status) {
    case "done":
      return "bg-green-50 dark:bg-green-950/30";
    case "in_progress":
      return "bg-yellow-50 dark:bg-yellow-950/30";
    case "in_review":
      return "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800";
    case "blocked":
      return "bg-red-50 dark:bg-red-950/30";
    default:
      return "bg-muted/30";
  }
}

function StepCard({ step, isLast }: { step: TrackStep; isLast: boolean }) {
  const isDone = step.issue.status === "done";
  const isInReview = step.issue.status === "in_review";

  return (
    <div className="relative">
      <Link
        to={`/issues/${step.issue.identifier ?? step.issue.id}`}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-all no-underline text-inherit ${getStepColor(step.issue.status)}`}
      >
        {/* Left: Status dot */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${isDone ? "bg-green-500" : step.issue.status === "in_progress" ? "bg-blue-500" : step.issue.status === "in_review" ? "bg-violet-500" : step.issue.status === "blocked" ? "bg-red-500" : "bg-gray-400"}`} />
        </div>

        {/* Middle: Title and details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusIcon status={step.issue.status} />
            <PriorityIcon priority={step.issue.priority} />
            <span className={`text-sm font-medium truncate ${isDone ? "line-through opacity-60" : ""}`}>
              {step.issue.title}
            </span>
          </div>
        </div>

        {/* Right: Agent badge or action badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {step.requiresAction && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 whitespace-nowrap">
              <Zap className="h-3 w-3" />
              Action requise
            </span>
          )}
          {step.isCurrentUser && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 whitespace-nowrap">
              Toi
            </span>
          )}
          {step.agent && !step.isCurrentUser && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-500/20 text-slate-600 dark:text-slate-400 whitespace-nowrap truncate max-w-[120px]">
              {step.agent.name}
            </span>
          )}
        </div>
      </Link>

      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-[13px] top-full w-0.5 h-4 bg-gradient-to-b from-current to-muted-foreground/30" />
      )}
    </div>
  );
}

export function Parcours() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Parcours" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const currentUserId = session?.user?.id;

  const tracks = useMemo(
    () => buildTracks(issues ?? [], agents ?? [], currentUserId),
    [issues, agents, currentUserId]
  );

  const completionStats = useMemo(() => {
    let total = 0;
    let done = 0;

    for (const track of tracks) {
      for (const step of track.steps) {
        total++;
        if (step.issue.status === "done") done++;
      }
    }

    return { done, total };
  }, [tracks]);

  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Create or select a company to view the parcours." />;
  }

  if (issuesLoading) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
            {completionStats.done} / {completionStats.total} étapes complétées
          </p>
          <p className="text-xs text-green-800/70 dark:text-green-400/70">
            {completionStats.total > 0 ? Math.round((completionStats.done / completionStats.total) * 100) : 0}% de progression globale
          </p>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-8">
        {tracks.map((track) => (
          <div key={track.config.id}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>{track.config.emoji}</span>
              <span>{track.config.title}</span>
              {track.steps.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {track.steps.filter((s) => s.issue.status === "done").length} / {track.steps.length}
                </span>
              )}
            </h2>

            {track.steps.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Aucune étape trouvée pour cette piste.</div>
            ) : (
              <div className="space-y-3 pl-2">
                {track.steps.map((step, idx) => (
                  <StepCard key={step.issue.id} step={step} isLast={idx === track.steps.length - 1} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
