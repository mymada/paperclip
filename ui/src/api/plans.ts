import { api } from "./client";

export interface IssuePlan {
  id: string;
  companyId: string;
  issueId: string;
  title: string;
  summary: string;
  steps: Array<{ order: number; description: string; estimatedMinutes?: number }>;
  estimatedCostUsd: string | null;
  risks: string[];
  successCriteria: string[];
  status: "draft" | "approved" | "rejected" | "superseded";
  createdByAgentId: string | null;
  approvedByUserId: string | null;
  rejectedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const plansApi = {
  list: (companyId: string, issueId?: string) => {
    const params = issueId ? `?issueId=${issueId}` : "";
    return api.get<IssuePlan[]>(`/companies/${companyId}/plans${params}`);
  },
  get: (companyId: string, planId: string) =>
    api.get<IssuePlan>(`/companies/${companyId}/plans/${planId}`),
  approve: (companyId: string, planId: string) =>
    api.post<IssuePlan>(`/companies/${companyId}/plans/${planId}/approve`, {}),
  reject: (companyId: string, planId: string, reason?: string) =>
    api.post<IssuePlan>(`/companies/${companyId}/plans/${planId}/reject`, { reason }),
};