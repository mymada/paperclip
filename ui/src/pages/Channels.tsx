import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Plus, Trash2, MessageSquare, Mail, Globe, Phone, Zap, Check } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { channelsApi, type ChannelConnection, type ChannelSession, type ChannelPairing } from "../api/channels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "slack":
      return Zap;
    case "telegram":
    case "discord":
      return MessageSquare;
    case "email":
      return Mail;
    case "webhook":
      return Globe;
    case "whatsapp":
    case "signal":
      return Phone;
    default:
      return Radio;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "connected":
      return "default"; // Green
    case "disconnected":
      return "secondary"; // Gray
    case "error":
      return "destructive"; // Red
    default:
      return "outline";
  }
}

export function Channels() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [draft, setDraft] = useState({
    platform: "",
    name: "",
    channelSecret: "",
    webhookUrl: "",
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Canaux" }]);
  }, [setBreadcrumbs]);

  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: queryKeys.channels.connections(selectedCompanyId!),
    queryFn: () => channelsApi.listConnections(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: queryKeys.channels.sessions(selectedCompanyId!),
    queryFn: () => channelsApi.listSessions(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: pendingPairings, isLoading: pairingsLoading } = useQuery({
    queryKey: queryKeys.channels.pairings(selectedCompanyId!),
    queryFn: () => channelsApi.listPendingPairings(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createConnection = useMutation({
    mutationFn: () =>
      channelsApi.createConnection(selectedCompanyId!, {
        platform: draft.platform,
        name: draft.name,
        config: {
          channelSecret: draft.channelSecret,
          ...(draft.webhookUrl && { webhookUrl: draft.webhookUrl }),
        },
      }),
    onSuccess: async () => {
      setDraft({ platform: "", name: "", channelSecret: "", webhookUrl: "" });
      setCreateDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.channels.connections(selectedCompanyId!) });
      pushToast({ title: "Created", body: "Connection created successfully.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const deleteConnection = useMutation({
    mutationFn: (connectionId: string) => channelsApi.deleteConnection(selectedCompanyId!, connectionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.channels.connections(selectedCompanyId!) });
      pushToast({ title: "Deleted", body: "Connection deleted.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  const approvePairing = useMutation({
    mutationFn: (code: string) => channelsApi.approvePairing(selectedCompanyId!, code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.channels.pairings(selectedCompanyId!) });
      pushToast({ title: "Approved", body: "Pairing approved successfully.", tone: "success" });
    },
    onError: (err: Error) => pushToast({ title: "Error", body: err.message, tone: "error" }),
  });

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
        <Radio className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a company to view channels</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <p className="text-sm text-muted-foreground">
            Manage external communication channels and active sessions.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add connection
        </Button>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add channel connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={draft.platform} onValueChange={(platform) => setDraft({ ...draft, platform })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="signal">Signal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Connection name"
              />
            </div>
            <div>
              <Label htmlFor="secret">Channel secret</Label>
              <Input
                id="secret"
                type="password"
                value={draft.channelSecret}
                onChange={(e) => setDraft({ ...draft, channelSecret: e.target.value })}
                placeholder="Channel secret/token"
              />
            </div>
            <div>
              <Label htmlFor="webhook">Webhook URL (optional)</Label>
              <Input
                id="webhook"
                value={draft.webhookUrl}
                onChange={(e) => setDraft({ ...draft, webhookUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createConnection.mutate()}
              disabled={createConnection.isPending || !draft.platform || !draft.name || !draft.channelSecret}
            >
              {createConnection.isPending ? "Creating..." : "Create connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {connectionsLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
          ) : (connections ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Radio className="h-8 w-8 opacity-40" />
              <p className="text-sm">No connections yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(connections ?? []).map((connection: ChannelConnection) => {
                const Icon = getPlatformIcon(connection.platform);
                return (
                  <Card key={connection.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{connection.name}</span>
                              <Badge variant="outline">{connection.platform}</Badge>
                              <Badge variant={getStatusBadgeVariant(connection.status)}>
                                {connection.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {connection.lastConnectedAt
                                ? `Last connected ${new Date(connection.lastConnectedAt).toLocaleString()}`
                                : "Never connected"}
                            </p>
                            {connection.lastError && (
                              <p className="text-xs text-destructive">{connection.lastError}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConnection.mutate(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!pairingsLoading && (pendingPairings ?? []).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending Pairings</h3>
              {(pendingPairings ?? []).map((pairing: ChannelPairing) => {
                const Icon = getPlatformIcon(pairing.platform);
                return (
                  <Card key={pairing.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">User {pairing.userId}</span>
                              <Badge variant="outline">{pairing.platform}</Badge>
                              <Badge variant="outline">Code: {pairing.code}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Expires {new Date(pairing.expiresAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => approvePairing.mutate(pairing.code)}
                          disabled={approvePairing.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessionsLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
          ) : (sessions ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(sessions ?? []).map((session: ChannelSession) => {
                const Icon = getPlatformIcon(session.platform);
                return (
                  <Card key={session.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{session.chatName || session.chatId}</span>
                            <Badge variant="outline">{session.platform}</Badge>
                            <Badge variant="secondary">{session.chatType}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{session.messageCount} messages</span>
                            {session.lastMessageAt && (
                              <span>Last: {new Date(session.lastMessageAt).toLocaleString()}</span>
                            )}
                            {session.userName && <span>User: {session.userName}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}