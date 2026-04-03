import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { plansApi, type IssuePlan } from "../api/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "approved":
      return "default"; // Green
    case "rejected":
      return "destructive"; // Red
    case "superseded":
      return "secondary"; // Muted
    case "draft":
    default:
      return "outline"; // Gray
  }
}

function formatCost(costUsd: string | null) {
  if (!costUsd) return "—";
  return `$${parseFloat(costUsd).toFixed(2)}`;
}

export function Plans() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [rejectingPlan, setRejectingPlan] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Plans" }]);
  }, [setBreadcrumbs]);

  const { data: plans, isLoading } = useQuery({
    queryKey: queryKeys.plans.list(selectedCompanyId!),
    queryFn: () => plansApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const approvePlan = useMutation({
    mutationFn: (planId: string) => plansApi.approve(selectedCompanyId!, planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(selectedCompanyId!) });
      pushToast({ title: "Approved", body: "Plan approved successfully.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const rejectPlan = useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason?: string }) =>
      plansApi.reject(selectedCompanyId!, planId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.plans.list(selectedCompanyId!) });
      setRejectingPlan(null);
      setRejectReason("");
      pushToast({ title: "Rejected", body: "Plan rejected.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const filteredPlans = (plans ?? []).filter((plan) => {
    if (activeTab === "all") return true;
    return plan.status === activeTab;
  });

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <ClipboardList className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a company to view plans</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve execution plans before agents can proceed with gated issues.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <ClipboardList className="h-8 w-8 opacity-40" />
              <p className="text-sm">No plans found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan: IssuePlan) => (
                <Card key={plan.id}>
                  <CardContent className="pt-4">
                    <Collapsible
                      open={expandedPlan === plan.id}
                      onOpenChange={(open) => setExpandedPlan(open ? plan.id : null)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-auto">
                                {expandedPlan === plan.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <span className="font-medium">{plan.title}</span>
                            <Badge variant={getStatusBadgeVariant(plan.status)}>
                              {plan.status}
                            </Badge>
                            <Badge variant="outline">
                              Issue #{plan.issueId.slice(0, 8)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCost(plan.estimatedCostUsd)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(plan.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{plan.summary}</p>
                        </div>
                        {plan.status === "draft" && (
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approvePlan.mutate(plan.id)}
                              disabled={approvePlan.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRejectingPlan(plan.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      <CollapsibleContent className="pt-4 space-y-4">
                        {plan.steps && plan.steps.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Steps</h4>
                            <ol className="text-sm space-y-1 list-decimal list-inside">
                              {plan.steps.map((step, index) => (
                                <li key={index} className="text-muted-foreground">
                                  {step.description}
                                  {step.estimatedMinutes && (
                                    <span className="ml-2 text-xs">({step.estimatedMinutes}min)</span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {plan.risks && plan.risks.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Risks</h4>
                            <ul className="text-sm space-y-1 list-disc list-inside">
                              {plan.risks.map((risk, index) => (
                                <li key={index} className="text-muted-foreground">{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {plan.successCriteria && plan.successCriteria.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Success Criteria</h4>
                            <ul className="text-sm space-y-1 list-disc list-inside">
                              {plan.successCriteria.map((criteria, index) => (
                                <li key={index} className="text-muted-foreground">{criteria}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CollapsibleContent>

                      {rejectingPlan === plan.id && (
                        <div className="pt-4 border-t border-border space-y-3">
                          <h4 className="text-sm font-medium">Rejection reason (optional)</h4>
                          <Input
                            placeholder="Why is this plan being rejected?"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => rejectPlan.mutate({ planId: plan.id, reason: rejectReason })}
                              disabled={rejectPlan.isPending}
                            >
                              {rejectPlan.isPending ? "Rejecting..." : "Reject plan"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRejectingPlan(null);
                                setRejectReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}