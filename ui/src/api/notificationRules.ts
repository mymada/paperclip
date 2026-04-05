import { api } from "./client";

export interface NotificationRule {
  id: string;
  companyId: string;
  name: string;
  triggerType: string;
  conditions: { agentId?: string; projectId?: string; minCostUsd?: number } | null;
  channelConnectionId: string | null;
  deliveryTarget: "channel" | "email" | "log";
  targetConfig: { email?: string; chatId?: string; agentId?: string } | null;
  messageTemplate: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDelivery {
  id: string;
  companyId: string;
  ruleId: string | null;
  triggerType: string;
  renderedMessage: string;
  deliveryTarget: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const notificationRulesApi = {
  list: (companyId: string) => api.get<NotificationRule[]>(`/companies/${companyId}/notification-rules`),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<NotificationRule>(`/companies/${companyId}/notification-rules`, data),
  update: (companyId: string, ruleId: string, data: Record<string, unknown>) =>
    api.patch<NotificationRule>(`/companies/${companyId}/notification-rules/${ruleId}`, data),
  delete: (companyId: string, ruleId: string) =>
    api.delete<void>(`/companies/${companyId}/notification-rules/${ruleId}`),
  listDeliveries: (companyId: string) => api.get<NotificationDelivery[]>(`/companies/${companyId}/notification-deliveries`),
};