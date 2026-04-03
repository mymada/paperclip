import { api } from "./client";

export interface ChannelConnection {
  id: string;
  companyId: string;
  platform: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  lastConnectedAt: string | null;
  lastError: string | null;
  policyConfig: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelSession {
  id: string;
  companyId: string;
  platform: string;
  chatId: string;
  chatType: string;
  chatName: string | null;
  userId: string | null;
  userName: string | null;
  sessionKey: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface ChannelPairing {
  id: string;
  companyId: string;
  connectionId: string;
  platform: string;
  userId: string;
  code: string;
  status: string;
  expiresAt: string;
  approvedByUserId: string | null;
  createdAt: string;
}

export const channelsApi = {
  listConnections: (companyId: string) => api.get<ChannelConnection[]>(`/companies/${companyId}/channel-connections`),
  createConnection: (companyId: string, data: Record<string, unknown>) =>
    api.post<ChannelConnection>(`/companies/${companyId}/channel-connections`, data),
  updateConnection: (companyId: string, connectionId: string, data: Record<string, unknown>) =>
    api.patch<ChannelConnection>(`/companies/${companyId}/channel-connections/${connectionId}`, data),
  deleteConnection: (companyId: string, connectionId: string) =>
    api.delete<void>(`/companies/${companyId}/channel-connections/${connectionId}`),
  listSessions: (companyId: string) => api.get<ChannelSession[]>(`/companies/${companyId}/channel-sessions`),
  listPendingPairings: (companyId: string) => api.get<ChannelPairing[]>(`/companies/${companyId}/channel-pairings`),
  approvePairing: (companyId: string, code: string) =>
    api.post<void>(`/companies/${companyId}/channel-pairings/approve`, { code }),
};