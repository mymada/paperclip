export interface ActivityEvent {
  id: string;
  companyId: string;
  actorType: "agent" | "user" | "system";
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  entityTitle?: string;
  agentId: string | null;
  runId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
