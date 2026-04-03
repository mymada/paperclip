import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { notificationRulesApi, type NotificationRule, type NotificationDelivery } from "../api/notificationRules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TRIGGER_LABELS: Record<string, string> = {
  "heartbeat.completed": "Run completed",
  "heartbeat.failed": "Run failed",
  "issue.completed": "Issue completed",
  "issue.stuck": "Issue stuck",
  "budget.exceeded": "Budget exceeded",
  "delegation.escalated": "Delegation escalated",
  "plan.approved": "Plan approved",
  "plan.rejected": "Plan rejected",
};

const TRIGGER_OPTIONS = [
  "heartbeat.completed",
  "heartbeat.failed",
  "issue.completed",
  "issue.stuck",
  "budget.exceeded",
  "delegation.escalated",
  "plan.approved",
  "plan.rejected",
];

function getBadgeColor(deliveryTarget: string) {
  switch (deliveryTarget) {
    case "log":
      return "secondary";
    case "email":
      return "default";
    case "channel":
      return "default";
    default:
      return "secondary";
  }
}

export function NotificationRules() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    triggerType: "",
    deliveryTarget: "log",
    messageTemplate: "",
    enabled: true,
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Notifications" }]);
  }, [setBreadcrumbs]);

  const { data: rules, isLoading } = useQuery({
    queryKey: queryKeys.notificationRules.list(selectedCompanyId!),
    queryFn: () => notificationRulesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: deliveries, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: queryKeys.notificationRules.deliveries(selectedCompanyId!),
    queryFn: () => notificationRulesApi.listDeliveries(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createRule = useMutation({
    mutationFn: () =>
      notificationRulesApi.create(selectedCompanyId!, {
        name: draft.name,
        triggerType: draft.triggerType,
        deliveryTarget: draft.deliveryTarget,
        messageTemplate: draft.messageTemplate || `{{triggerType}} event: {{agentId}} - {{costUsd}}`,
        enabled: draft.enabled,
        channelConnectionId: null,
        targetConfig: null,
        conditions: null,
      }),
    onSuccess: async () => {
      setDraft({ name: "", triggerType: "", deliveryTarget: "log", messageTemplate: "", enabled: true });
      setCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationRules.list(selectedCompanyId!) });
      pushToast({ title: "Saved", body: "Rule created.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const updateRule = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: Record<string, unknown> }) =>
      notificationRulesApi.update(selectedCompanyId!, ruleId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationRules.list(selectedCompanyId!) });
      pushToast({ title: "Updated", body: "Rule updated.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) => notificationRulesApi.delete(selectedCompanyId!, ruleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationRules.list(selectedCompanyId!) });
      pushToast({ title: "Deleted", body: "Rule deleted.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <Bell className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a company to view notification rules</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Notification Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure which events trigger notifications and where they are delivered.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create rule
        </Button>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create notification rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Rule name"
              />
            </div>
            <div>
              <Label htmlFor="trigger">Trigger type</Label>
              <Select value={draft.triggerType} onValueChange={(triggerType) => setDraft({ ...draft, triggerType })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {TRIGGER_LABELS[trigger]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="delivery">Delivery target</Label>
              <Select value={draft.deliveryTarget} onValueChange={(deliveryTarget) => setDraft({ ...draft, deliveryTarget })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="log">Log</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template">Message template</Label>
              <Textarea
                id="template"
                value={draft.messageTemplate}
                onChange={(e) => setDraft({ ...draft, messageTemplate: e.target.value })}
                placeholder="{{agentId}}, {{costUsd}}, {{triggerType}}"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRule.mutate()}
              disabled={createRule.isPending || !draft.name || !draft.triggerType}
            >
              {createRule.isPending ? "Creating..." : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="deliveries">Delivery Log</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {(rules ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">No notification rules yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(rules ?? []).map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.name}</span>
                          <Badge variant={getBadgeColor(rule.deliveryTarget)}>
                            {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
                          </Badge>
                          <Badge variant="outline">{rule.deliveryTarget}</Badge>
                          {rule.enabled && <Badge variant="default">Enabled</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{rule.messageTemplate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.enabled}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rule.enabled ? "bg-foreground" : "bg-muted"
                          }`}
                          onClick={() =>
                            updateRule.mutate({ ruleId: rule.id, data: { enabled: !rule.enabled } })
                          }
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                              rule.enabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          {isLoadingDeliveries ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
          ) : (deliveries ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">No deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(deliveries ?? []).map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={getBadgeColor(delivery.deliveryTarget)}>
                          {TRIGGER_LABELS[delivery.triggerType] || delivery.triggerType}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant={delivery.status === "sent" ? "default" : "destructive"}>
                            {delivery.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {delivery.sentAt ? new Date(delivery.sentAt).toLocaleString() : "Not sent"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivery.renderedMessage.length > 100
                          ? `${delivery.renderedMessage.slice(0, 100)}...`
                          : delivery.renderedMessage}
                      </p>
                      {delivery.error && (
                        <p className="text-xs text-destructive">{delivery.error}</p>
                      )}
                    </div>
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