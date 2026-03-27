import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { authApi } from "../api/auth";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { agentsApi } from "../api/agents";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Link } from "@/lib/router";
import { AlertTriangle, ChevronDown, ChevronRight, Send, CheckCircle2, Bot, ExternalLink, Clock, FileText, Eye } from "lucide-react";
import type { Issue, Agent } from "@paperclipai/shared";
import { DocumentPreviewModal } from "../components/DocumentPreviewModal";

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Extrait la 1ère action concrète de la description */
function extractAction(description: string | null): string | null {
  if (!description) return null;
  // Cherche "Ce que tu dois faire", "Ce qui te demande", "Action", etc.
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (/ce que tu (dois|fais)|action (attendue|requise)|à faire|tu dois|ce qui te|étapes/i.test(l)) {
      // Retourne la ligne suivante qui est le vrai contenu
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]!.replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").replace(/\*\*/g, "");
        if (next.length > 10 && !next.startsWith("#")) return next.slice(0, 160);
      }
    }
  }
  // Fallback : première vraie phrase après le titre
  for (const l of lines) {
    const clean = l.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/^[-*\d.]\s*/, "");
    if (clean.length > 20 && !clean.startsWith("http") && !/^##/.test(l)) return clean.slice(0, 160);
  }
  return null;
}

/** Extrait les options de décision (OUI/NON, Choix A/B, etc.) */
function extractOptions(description: string | null): string[] {
  if (!description) return [];
  const opts: string[] = [];
  const lines = description.split("\n");
  for (const line of lines) {
    const m = line.match(/^[-*]\s+\*\*([^*]{2,30})\*\*\s*:/);
    if (m) opts.push(m[1]!);
  }
  return opts.slice(0, 4);
}

/** Détermine si cette issue nécessite une action physique du fondateur (pas un document d'agent) */
function isPhysicalAction(issue: Issue): boolean {
  return /rupture conventionnelle|compte France Travail|compte bancaire|checklist.*avant/i.test(issue.title);
}

/** Badge d'état pour l'issue */
function IssueStateBadge({ issue, agent }: { issue: Issue; agent: Agent | null }) {
  if (issue.status === "in_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
        <FileText className="h-3 w-3" />
        Documents prêts — à valider
      </span>
    );
  }
  if (issue.status === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Bloqué — ton input requis
      </span>
    );
  }
  if (agent && !isPhysicalAction(issue)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
        <Clock className="h-3 w-3" />
        {agent.name} prépare les documents…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
      <AlertTriangle className="h-3 w-3" />
      Action physique requise
    </span>
  );
}

function IssueCard({
  issue,
  agentMap,
  onFeedbackSent,
}: {
  issue: Issue;
  agentMap: Map<string, Agent>;
  onFeedbackSent: (issueId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  const agent = issue.assigneeAgentId ? agentMap.get(issue.assigneeAgentId) : null;
  const action = extractAction(issue.description ?? null);
  const options = extractOptions(issue.description ?? null);
  const physical = isPhysicalAction(issue);
  // agentPreparing = l'agent a l'issue et elle n'est pas encore en attente de validation
  const agentPreparing = !!agent && !physical && issue.status !== "in_review" && issue.status !== "blocked";

  const { mutate: sendComment, isPending } = useMutation({
    mutationFn: (body: string) => issuesApi.addComment(issue.id, body, true),
    onSuccess: () => {
      setSent(true);
      setComment("");
      onFeedbackSent(issue.id);
    },
  });

  const handleSend = (text: string) => {
    const body = text.trim();
    if (!body) return;
    sendComment(body);
  };

  if (sent) {
    return (
      <div className="border border-green-500/30 bg-green-950/10 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-300">Réponse envoyée</p>
          <p className="text-xs text-green-400/70 mt-0.5">
            {agent
              ? <><span className="font-medium">{agent.name}</span> va prendre le relais automatiquement.</>
              : "Les agents vont traiter ta réponse."}
          </p>
          <Link to={`/issues/${issue.identifier ?? issue.id}`} className="text-xs text-green-400 underline underline-offset-2 mt-1 inline-block">
            Suivre l'avancement →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${issue.status === "in_review" ? "border-green-500/40" : "border-border"}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
      >
        <span className="shrink-0 mt-0.5"><StatusIcon status={issue.status} /></span>
        <span className="shrink-0 mt-0.5"><PriorityIcon priority={issue.priority} /></span>
        <span className="flex-1 min-w-0">
          <span className="text-sm font-medium leading-snug block">{issue.title}</span>
          <span className="mt-1 block">
            <IssueStateBadge issue={issue} agent={agent ?? null} />
          </span>
        </span>
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border bg-card/50 px-4 py-4 space-y-4">

          {/* État : agent en train de préparer */}
          {agentPreparing && (
            <div className="rounded-md bg-amber-950/20 border border-amber-500/20 px-3 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Agent en cours</p>
              </div>
              <p className="text-sm text-amber-100">
                <span className="font-medium">{agent!.name}</span> prépare les documents et livrables pour cette issue.
                Cette carte se mettra à jour automatiquement quand c'est prêt.
              </p>
              <p className="text-xs text-amber-400/70 mt-1">
                Tu pourras valider ou commenter une fois les documents produits.
              </p>
            </div>
          )}

          {/* État : documents prêts à valider */}
          {issue.status === "in_review" && (
            <div className="rounded-md bg-green-950/20 border border-green-500/30 px-3 py-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-green-400" />
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Documents prêts</p>
              </div>
              <p className="text-sm text-green-100">
                {agent?.name ?? "L'agent"} a produit les livrables. Lis-les directement ici, puis valide ou demande des modifications.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Lire les documents
                </button>
                <Link
                  to={`/issues/${issue.identifier ?? issue.id}`}
                  className="inline-flex items-center gap-1 text-xs text-green-400/60 hover:text-green-400 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir l'issue
                </Link>
              </div>
              <DocumentPreviewModal
                issueId={issue.id}
                issueTitle={issue.title}
                open={previewOpen}
                onOpenChange={setPreviewOpen}
              />
            </div>
          )}

          {/* Action physique : ce que le fondateur doit faire lui-même */}
          {physical && action && (
            <div className="rounded-md bg-blue-950/20 border border-blue-500/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Ce que tu dois faire</p>
              <p className="text-sm text-blue-100">{action}</p>
            </div>
          )}

          {/* Options de décision rapide */}
          {options.length > 0 && !agentPreparing && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Choix rapide</p>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSend(`✅ Choix : **${opt}**`)}
                    disabled={isPending}
                    className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Champ de réponse / feedback */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {agentPreparing ? "Ajouter un commentaire (optionnel)" : "Ta réponse / validation"}
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                agentPreparing
                  ? "Ajoute des précisions pour guider l'agent..."
                  : physical
                  ? "Confirme quand c'est fait, ou donne les informations demandées..."
                  : "Valide, approuve ou demande des modifications..."
              }
              rows={3}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
                {agent
                  ? <span>→ <span className="font-medium text-foreground">{agent.name}</span> lira et prendra le relais</span>
                  : <span>→ Les agents traiteront ta réponse</span>
                }
              </div>
              <button
                onClick={() => handleSend(comment)}
                disabled={!comment.trim() || isPending}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {isPending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to={`/issues/${issue.identifier ?? issue.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              <ExternalLink className="h-3 w-3" />
              Voir l'issue complète et les livrables
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyIssues() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [refreshKey, setRefreshKey] = useState(0);
  // IDs des issues sur lesquelles le fondateur a répondu → cachées jusqu'au prochain action de l'agent
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setBreadcrumbs([{ label: "Mes Actions" }]);
  }, [setBreadcrumbs]);

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const currentUserId = session?.user?.id;

  // Requête 1 : issues qui attendent la validation du fondateur (agent a fini)
  const { data: agentDoneIssues, isLoading: loadingAgentDone } = useQuery({
    queryKey: [...queryKeys.issues.list(selectedCompanyId!), "agent-done", refreshKey],
    queryFn: () => issuesApi.list(selectedCompanyId!, { status: "in_review,blocked" }),
    enabled: !!selectedCompanyId,
  });

  // Requête 2 : issues assignées directement au fondateur (actions physiques)
  const { data: myDirectIssues, isLoading: loadingMyDirect } = useQuery({
    queryKey: [...queryKeys.issues.list(selectedCompanyId!), "my-direct", refreshKey],
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, {
        assigneeUserId: currentUserId,
        status: "todo,in_progress",
      }),
    enabled: !!selectedCompanyId && !!currentUserId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const isLoading = loadingAgentDone || loadingMyDirect;

  const agentMap = new Map<string, Agent>();
  for (const a of agents ?? []) agentMap.set(a.id, a);

  // Merge les deux listes, déduplique par id, trie par priorité
  const seen = new Set<string>();
  const founderIssues = [
    ...(agentDoneIssues ?? []),
    // Uniquement les issues assignées au fondateur SANS agent (action physique pure)
    ...(myDirectIssues ?? []).filter((i) => !i.assigneeAgentId),
  ]
    .filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      // Masquer les issues sur lesquelles le fondateur a déjà répondu
      if (dismissedIds.has(i.id)) return false;
      return true;
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  if (!selectedCompanyId) return <EmptyState icon={AlertTriangle} message="Sélectionne une compagnie." />;
  if (isLoading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Explication */}
      <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Ces issues nécessitent <strong className="text-foreground">ta décision ou validation</strong> avant que les agents puissent avancer.
        Clique sur une issue pour voir ce qu'on attend de toi, donne ta réponse, et l'agent assigné prendra le relais automatiquement.
      </div>

      {founderIssues.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium">Aucune action requise de ta part pour l'instant.</p>
          <p className="text-xs text-muted-foreground mt-1">Les agents travaillent de leur côté.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {founderIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              agentMap={agentMap}
              onFeedbackSent={(id) => setDismissedIds((s) => new Set([...s, id]))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
